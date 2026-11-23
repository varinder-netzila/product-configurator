import { Resend } from 'resend';
import { emailStrings } from './emailTranslations';
import PDFDocument from "pdfkit";
import sharp from "sharp";
const resend = new Resend(process.env.RESEND_API_KEY);

interface B2BFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string;
  bottleName: string;
  bottlePrice: number;
  numberOfBottles: number;
  totalPrice: number;
  /** Locale the customer used (en/nl/fr/de) — both emails are sent in it. */
  locale?: string;
  designLink?: string;
  mockupLink?: string;
  /** Suggested/advice B2B unit + total price (volume-based). */
  advicePrice?: number;
  advicePriceTotal?: number;
  /** White-label reseller this request came through, if any. */
  resellerId?: string;
  resellerName?: string;
  resellerEmail?: string;
  resellerAccentColor?: string;
  resellerLogoUrl?: string;
}

interface B2BConfiguration {
  bottleType?: string;
  meshColors?: Record<string, any>;
  texture?: string | null;
  [key: string]: any;
}

export async function sendB2BNotification(
  formData: B2BFormData,
  configuration: B2BConfiguration
): Promise<{ success: boolean; error?: string }> {
  const salesEmail = process.env.B2B_SALES_EMAIL;
  console.log('mockupLink: ', formData.mockupLink);
  if (!salesEmail) {
    console.warn('B2B_SALES_EMAIL not configured — skipping email notification');
    return { success: false, error: 'Sales email not configured' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured — skipping email notification');
    return { success: false, error: 'Resend API key not configured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  // Reseller-routed requests go to BOTH the reseller and IZY (sales) so both
  // parties have the lead. De-duplicate in case they're the same address.
  const recipients = Array.from(
    new Set([salesEmail, formData.resellerEmail].filter((e): e is string => !!e)),
  );
  const resellerTag = formData.resellerName ? ` [via ${formData.resellerName}]` : '';

  // Both emails follow the customer's selected language.
  const T = emailStrings(formData.locale);

  // ImageKit force-download URL (sets Content-Disposition: attachment).


const asDownload = async (
  url: string,
  label: string
): Promise<string> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to fetch image");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  const metadata = await sharp(imageBuffer).metadata();

  const jpegBuffer = await sharp(imageBuffer)
    .jpeg({ quality: 95 })
    .toBuffer();

  const layout =
    (metadata.width ?? 1) > (metadata.height ?? 1)
      ? "landscape"
      : "portrait";

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout,
      margin: 0,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.image(jpegBuffer, 0, 0, {
      fit: [doc.page.width, doc.page.height],
      align: "center",
      valign: "center",
    });

    doc.end();
  });

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing IMAGEKIT_PRIVATE_KEY");
  }

  const fileName = `${label.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  const formData = new FormData();

  formData.append(
    "file",
    new Blob([new Uint8Array(pdfBuffer)], {
      type: "application/pdf",
    }),
    fileName
  );

  formData.append("fileName", fileName);
  formData.append("folder", "/b2b-pdfs");

  const uploadResponse = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${privateKey}:`
        ).toString("base64")}`,
      },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `ImageKit upload failed: ${await uploadResponse.text()}`
    );
  }

  const result = await uploadResponse.json();

  return result.url;
};

  // The advice (B2B volume) price is what the quote is based on. Fall back to
  // the retail price only if the advice price wasn't provided.
  const unitPrice = formData.advicePrice ?? formData.bottlePrice;
  const totalPrice = formData.advicePriceTotal ?? formData.totalPrice;

  // Build a "Design assets" block: 3D mockup + flat print design, each shown as
  // a thumbnail with a download link. Either may be absent.
const assetCard = (
  label: string,
  url: string,
  pdfUrl: string
) => `
  <td style="padding: 8px 12px 8px 0; vertical-align: top;">
    <a href="${url}" target="_blank">
      <img src="${url}" alt="${label}" width="220"
        style="display:block;width:220px;height:auto;border:1px solid #e5e5e5;border-radius:8px;" />
    </a>
    <div style="margin-top:6px;font-size:13px;">
      <strong>${label}</strong> —
      <a href="${pdfUrl}" style="color:#2563eb;">${T.download} PDF</a>
    </div>
  </td>`;
    const mockupLink = await asDownload(formData.mockupLink ? formData.mockupLink: '', T.mockup);
    const designLink = await asDownload(formData.designLink? formData.designLink: '', T.flatDesign);
  const assetCells = [
    formData.mockupLink ? assetCard(T.mockup, formData.mockupLink, mockupLink) : '',
    formData.designLink ? assetCard(T.flatDesign, formData.designLink, designLink) : '',
  ].join('');

  const designAssetsBlock = assetCells
    ? `
      <h2 style="color: #333; margin-top: 24px;">${T.design}</h2>
      <table style="border-collapse: collapse;"><tr>${assetCells}</tr></table>`
    : '';

  // Customer-facing branding: use the reseller's name, accent colour and logo
  // when the request came through a white-label embed, otherwise neutral.
  const brandName = formData.resellerName || '3D Board Configurator - Marvins';
  const brandAccent = formData.resellerAccentColor || '#1a1a1a';
  const brandHeader = formData.resellerLogoUrl
    ? `<img src="${formData.resellerLogoUrl}" alt="${brandName}" style="max-height: 48px; width: auto; display: block; margin-bottom: 16px;" />`
    : `<div style="font-size: 20px; font-weight: bold; color: ${brandAccent}; margin-bottom: 16px;">${brandName}</div>`;

  try {
    await resend.emails.send({
      from: `3D Board Configurator - Marvins <${fromEmail}>`,
      to: recipients,
      replyTo: formData.email,
      subject: `${T.newRequest}${resellerTag}: ${formData.companyName} — ${formData.numberOfBottles}x ${formData.bottleName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 12px;">
            ${T.newRequest}
          </h1>

          <h2 style="color: #333; margin-top: 24px;">${T.productDetails}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 140px;">${T.product}</td>
              <td style="padding: 8px 0; font-weight: bold;">${formData.bottleName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${T.quantity}</td>
              <td style="padding: 8px 0; font-weight: bold;">${formData.numberOfBottles} ${T.units}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${T.adviceUnitPrice}</td>
              <td style="padding: 8px 0;">&euro;${unitPrice.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${T.estimatedTotal}</td>
              <td style="padding: 8px 0; font-weight: bold;">&euro;${totalPrice.toFixed(2)}</td>
            </tr>
          </table>

          ${designAssetsBlock}

          <h2 style="color: #333; margin-top: 24px;">${T.contactInfo}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 140px;">${T.name}</td>
              <td style="padding: 8px 0; font-weight: bold;">${formData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${T.company}</td>
              <td style="padding: 8px 0; font-weight: bold;">${formData.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${T.email}</td>
              <td style="padding: 8px 0;"><a href="mailto:${formData.email}" style="color: #2563eb;">${formData.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${T.phone}</td>
              <td style="padding: 8px 0;">${formData.phone}</td>
            </tr>
          </table>

          <h2 style="color: #333; margin-top: 24px;">${T.shippingAddress}</h2>
          <p style="margin: 4px 0; color: #333;">
            ${formData.streetAddress}<br>
            ${formData.postalCode} ${formData.city}<br>
            ${formData.country}
          </p>

          ${formData.notes ? `
          <h2 style="color: #333; margin-top: 24px;">${T.additionalNotes}</h2>
          <p style="margin: 4px 0; color: #333; white-space: pre-wrap;">${formData.notes}</p>
          ` : ''}

          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #999; font-size: 12px; margin-top: 12px;">
            ${T.automatedFooter}
          </p>
        </div>
      `,
    });

    // Also send a confirmation to the customer
    await resend.emails.send({
      from: `${brandName} <${fromEmail}>`,
      to: [formData.email],
      subject: T.custSubject.replace('{brand}', brandName),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${brandHeader}
          <h1 style="color: ${brandAccent};">${T.thankYou}</h1>
          <p style="color: #333; line-height: 1.6;">
            ${T.hi.replace('{name}', formData.name)}
          </p>
          <p style="color: #333; line-height: 1.6;">
            ${T.received
              .replace('{qty}', String(formData.numberOfBottles))
              .replace('{product}', `<strong>${formData.bottleName}</strong>`)}
          </p>

          ${designAssetsBlock}

          <p style="color: #333; line-height: 1.6;">
            ${T.questions}
          </p>

          <p style="color: #333; line-height: 1.6; margin-top: 24px;">
            ${T.regards}<br>
            ${T.team.replace('{brand}', brandName)}
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
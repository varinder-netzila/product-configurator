import { Resend } from "resend";
import { emailStrings } from "./emailTranslations";
import { PDFDocument } from "pdf-lib";

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

/**
 * Downloads an ImageKit image, converts it to JPEG for PDF embedding,
 * creates a single-page A4 PDF, uploads that PDF to ImageKit, and returns
 * the PDF URL.
 */
const asDownload = async (
  imageUrl: string,
  label: string
): Promise<string> => {
  if (!imageUrl) {
    throw new Error(`Missing image URL for ${label}`);
  }

  // Ask ImageKit to serve a JPEG (it also applies EXIF orientation), so no
  // native image library is needed. pdf-lib embeds JPEG directly.
  const jpgUrl = new URL(imageUrl);
  jpgUrl.searchParams.set("tr", "f-jpg");

  const imageResponse = await fetch(jpgUrl.toString());

  if (!imageResponse.ok) {
    throw new Error(
      `Unable to fetch ${label} image: ${imageResponse.status} ${imageResponse.statusText}`
    );
  }

  const jpegBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // pdf-lib is pure JS (no font files, no native binaries), so it works
  // reliably in serverless environments.
  const pdf = await PDFDocument.create();
  const jpg = await pdf.embedJpg(jpegBuffer);

  if (!jpg.width || !jpg.height) {
    throw new Error(`Unable to read dimensions for ${label}`);
  }

  // A4 in points, 20pt margin, orientation follows the image.
  const landscape = jpg.width > jpg.height;
  const page = pdf.addPage(
    landscape ? [841.89, 595.28] : [595.28, 841.89]
  );

  const margin = 20;
  const scale = Math.min(
    (page.getWidth() - margin * 2) / jpg.width,
    (page.getHeight() - margin * 2) / jpg.height
  );
  const w = jpg.width * scale;
  const h = jpg.height * scale;

  page.drawImage(jpg, {
    x: (page.getWidth() - w) / 2,
    y: (page.getHeight() - h) / 2,
    width: w,
    height: h,
  });

  const pdfBuffer = Buffer.from(await pdf.save());

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing IMAGEKIT_PRIVATE_KEY");
  }

  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeLabel}-${Date.now()}.pdf`;

  const uploadData = new FormData();

  uploadData.append(
    "file",
    new Blob([new Uint8Array(pdfBuffer)], {
      type: "application/pdf",
    }),
    fileName
  );
  uploadData.append("fileName", fileName);
  uploadData.append("folder", "/b2b-pdfs");

  const uploadResponse = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${privateKey}:`
        ).toString("base64")}`,
      },
      body: uploadData,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `ImageKit PDF upload failed: ${await uploadResponse.text()}`
    );
  }

  const uploadResult = await uploadResponse.json();

  if (!uploadResult.url) {
    throw new Error("ImageKit upload succeeded but did not return a PDF URL");
  }

  return uploadResult.url as string;
};

export async function sendB2BNotification(
  formData: B2BFormData,
  configuration: B2BConfiguration
): Promise<{ success: boolean; error?: string }> {
  const salesEmail = process.env.B2B_SALES_EMAIL;

  console.log("mockupLink:", formData.mockupLink);

  if (!salesEmail) {
    console.warn(
      "B2B_SALES_EMAIL not configured — skipping email notification"
    );
    return { success: false, error: "Sales email not configured" };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "RESEND_API_KEY not configured — skipping email notification"
    );
    return { success: false, error: "Resend API key not configured" };
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  // Reseller-routed requests go to BOTH the reseller and IZY (sales).
  // De-duplicate in case they are the same address.
  const recipients = Array.from(
    new Set(
      [salesEmail, formData.resellerEmail].filter(
        (email): email is string => !!email
      )
    )
  );

  const resellerTag = formData.resellerName
    ? ` [via ${formData.resellerName}]`
    : "";

  // Both emails follow the customer's selected language.
  const T = emailStrings(formData.locale);

  // The advice (B2B volume) price is what the quote is based on.
  // Fall back to the retail price only if the advice price wasn't provided.
  const unitPrice = formData.advicePrice ?? formData.bottlePrice;
  const totalPrice = formData.advicePriceTotal ?? formData.totalPrice;

  // Build the email asset card. The thumbnail links to the original image;
  // the download link points to the generated PDF.
  const assetCard = (
    label: string,
    imageUrl: string,
    pdfUrl: string
  ) => `
    <td style="padding: 8px 12px 8px 0; vertical-align: top;">
      <a href="${imageUrl}" target="_blank" style="text-decoration:none;">
        <img
          src="${imageUrl}"
          alt="${label}"
          width="220"
          style="display:block;width:220px;height:auto;border:1px solid #e5e5e5;border-radius:8px;"
        />
      </a>
      <div style="margin-top:6px;font-size:13px;">
        <strong>${label}</strong> —
        <a href="${pdfUrl}" target="_blank" style="color:#2563eb;">
          ${T.download} PDF
        </a>
      </div>
    </td>
  `;

  // Customer-facing branding.
  const brandName =
    formData.resellerName || "3D Board Configurator - Marvins";
  const brandAccent = formData.resellerAccentColor || "#1a1a1a";

  const brandHeader = formData.resellerLogoUrl
    ? `<img src="${formData.resellerLogoUrl}" alt="${brandName}" style="max-height:48px;width:auto;display:block;margin-bottom:16px;" />`
    : `<div style="font-size:20px;font-weight:bold;color:${brandAccent};margin-bottom:16px;">${brandName}</div>`;

  try {
    // Generate PDFs only for images that actually exist. Keep this inside the
    // try block so fetch, conversion, and upload errors are caught below.
    // A failed PDF must never block the emails: fall back to the image link.
    const safePdf = async (url: string | undefined, label: string) => {
      if (!url) return "";
      try {
        return await asDownload(url, label);
      } catch (e) {
        console.error(`PDF generation failed for ${label}:`, e);
        return url;
      }
    };

    const mockupPdfUrl = await safePdf(formData.mockupLink, T.mockup);
    const designPdfUrl = await safePdf(formData.designLink, T.flatDesign);

    const assetCells = [
      formData.mockupLink
        ? assetCard(T.mockup, formData.mockupLink, mockupPdfUrl)
        : "",
      formData.designLink
        ? assetCard(T.flatDesign, formData.designLink, designPdfUrl)
        : "",
    ].join("");

    const designAssetsBlock = assetCells
      ? `
        <h2 style="color:#333;margin-top:24px;">${T.design}</h2>
        <table style="border-collapse:collapse;">
          <tr>${assetCells}</tr>
        </table>
      `
      : "";

    await resend.emails.send({
      from: `3D Board Configurator - Marvins <${fromEmail}>`,
      to: recipients,
      replyTo: formData.email,
      subject: `${T.newRequest}${resellerTag}: ${formData.companyName} — ${formData.numberOfBottles}x ${formData.bottleName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h1 style="color:#1a1a1a;border-bottom:2px solid #e5e5e5;padding-bottom:12px;">
            ${T.newRequest}
          </h1>

          <h2 style="color:#333;margin-top:24px;">${T.productDetails}</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#666;width:140px;">${T.product}</td>
              <td style="padding:8px 0;font-weight:bold;">${formData.bottleName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">${T.quantity}</td>
              <td style="padding:8px 0;font-weight:bold;">${formData.numberOfBottles} ${T.units}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">${T.adviceUnitPrice}</td>
              <td style="padding:8px 0;">&euro;${unitPrice.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">${T.estimatedTotal}</td>
              <td style="padding:8px 0;font-weight:bold;">&euro;${totalPrice.toFixed(2)}</td>
            </tr>
          </table>

          ${designAssetsBlock}

          <h2 style="color:#333;margin-top:24px;">${T.contactInfo}</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#666;width:140px;">${T.name}</td>
              <td style="padding:8px 0;font-weight:bold;">${formData.name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">${T.company}</td>
              <td style="padding:8px 0;font-weight:bold;">${formData.companyName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">${T.email}</td>
              <td style="padding:8px 0;">
                <a href="mailto:${formData.email}" style="color:#2563eb;">${formData.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">${T.phone}</td>
              <td style="padding:8px 0;">${formData.phone}</td>
            </tr>
          </table>

          <h2 style="color:#333;margin-top:24px;">${T.shippingAddress}</h2>
          <p style="margin:4px 0;color:#333;">
            ${formData.streetAddress}<br>
            ${formData.postalCode} ${formData.city}<br>
            ${formData.country}
          </p>

          ${
            formData.notes
              ? `
                <h2 style="color:#333;margin-top:24px;">${T.additionalNotes}</h2>
                <p style="margin:4px 0;color:#333;white-space:pre-wrap;">${formData.notes}</p>
              `
              : ""
          }

          <hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5;">
          <p style="color:#999;font-size:12px;margin-top:12px;">
            ${T.automatedFooter}
          </p>
        </div>
      `,
    });

    // Also send a confirmation to the customer.
    await resend.emails.send({
      from: `${brandName} <${fromEmail}>`,
      to: [formData.email],
      subject: T.custSubject.replace("{brand}", brandName),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          ${brandHeader}
          <h1 style="color:${brandAccent};">${T.thankYou}</h1>

          <p style="color:#333;line-height:1.6;">
            ${T.hi.replace("{name}", formData.name)}
          </p>

          <p style="color:#333;line-height:1.6;">
            ${T.received
              .replace("{qty}", String(formData.numberOfBottles))
              .replace(
                "{product}",
                `<strong>${formData.bottleName}</strong>`
              )}
          </p>

          ${designAssetsBlock}

          <p style="color:#333;line-height:1.6;">
            ${T.questions}
          </p>

          <p style="color:#333;line-height:1.6;margin-top:24px;">
            ${T.regards}<br>
            ${T.team.replace("{brand}", brandName)}
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("B2B notification error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to send email";

    return { success: false, error: message };
  }
}
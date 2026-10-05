import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://www.marvins.eu',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function POST(req: Request) {
  try {

    const data = await req.json();

    const rows = Object.entries(data)
      .map(([key, value]) => {
        return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">
              ${key}
            </td>
            <td style="padding:8px;border:1px solid #ddd;">
              ${value}
            </td>
          </tr>
        `;
      })
      .join('');

    await resend.emails.send({
      from: 'info@marvinscloud.com',
      to: ['designertest167@gmail.com'],
      subject: `Quote Request - ${data.product_title || 'Product'}`,
      html: `
        <h2>Quote Request</h2>

        <table
          cellpadding="0"
          cellspacing="0"
          style="border-collapse:collapse;"
        >
          ${rows}
        </table>
      `
    });

    return NextResponse.json({
      success: true,
      message: 'Quote request sent'
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed'
      },
      {
        status: 500
      }
    );
  }
}
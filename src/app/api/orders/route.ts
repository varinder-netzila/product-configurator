// import { NextRequest, NextResponse } from 'next/server';
// import { getShopifyClient } from '@/lib/shopify';
// import { sendB2BNotification } from '@/lib/email';
// import { saveLead } from '@/lib/leads';

// export async function GET(request: NextRequest) {
//   try {
//     const url = new URL(request.url);
//     const shop = url.searchParams.get('shop');

//     if (!shop) {
//       return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
//     }

//     const client = await getShopifyClient(shop);
//     const response = await client.get({ path: 'orders', query: { status: 'any', limit: '50' } });
//     const orders = (response.body as any).orders;

//     return NextResponse.json({ orders });
//   } catch (error: any) {
//     console.error('Orders fetch error:', error);

//     if (error.message?.includes('No active session')) {
//       return NextResponse.json(
//         { error: 'Not authenticated. Please authenticate first.', requiresAuth: true },
//         { status: 401 }
//       );
//     }

//     return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();

//     if (body.type === 'B2B_REQUEST') {
//       const { formData, configuration } = body;

//       // Send email notification to sales team
//       const emailResult = await sendB2BNotification(formData, configuration);

//       if (!emailResult.success) {
//         console.error('Failed to send B2B notification email:', emailResult.error);
//       }

//       const b2bRequest = {
//         id: `B2B-${Date.now()}`,
//         status: 'pending',
//         created_at: new Date().toISOString(),
//         ...formData,
//         configuration,
//         emailSent: emailResult.success,
//       };

//       // Persist the lead for the admin dashboard (only small, safe fields — no
//       // data-URL textures). Never blocks the response.
//       await saveLead({
//         id: b2bRequest.id,
//         createdAt: b2bRequest.created_at,
//         name: formData.name,
//         email: formData.email,
//         phone: formData.phone,
//         companyName: formData.companyName,
//         streetAddress: formData.streetAddress,
//         city: formData.city,
//         postalCode: formData.postalCode,
//         country: formData.country,
//         notes: formData.notes,
//         bottleName: formData.bottleName,
//         numberOfBottles: formData.numberOfBottles,
//         advicePrice: formData.advicePrice,
//         advicePriceTotal: formData.advicePriceTotal,
//         retailPrice: formData.bottlePrice,
//         designLink: formData.designLink,
//         mockupLink: formData.mockupLink,
//         resellerId: formData.resellerId,
//         resellerName: formData.resellerName,
//       });

//       console.log('B2B Request processed:', {
//         requestId: b2bRequest.id,
//         company: formData.companyName,
//         quantity: formData.numberOfBottles,
//         emailSent: emailResult.success,
//         timestamp: b2bRequest.created_at,
//       });

//       return NextResponse.json({
//         success: true,
//         message: 'B2B request submitted successfully. Our team will contact you shortly.',
//         requestId: b2bRequest.id,
//         emailSent: emailResult.success,
//       });
//     }

//     return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
//   } catch (error) {
//     console.error('B2B request error:', error);
//     return NextResponse.json({ error: 'Failed to process B2B request' }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { getShopifyClient } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
    }

    const client = await getShopifyClient(shop);
    const response = await client.get({ path: 'products', query: { limit: '50' } });
    const products = (response.body as any).products;

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Products fetch error:', error);

    if (error.message?.includes('No active session')) {
      return NextResponse.json(
        { error: 'Not authenticated. Please authenticate first.', requiresAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { shop, configuration } = await request.json();

    if (!shop || !configuration) {
      return NextResponse.json({ error: 'Shop and configuration data are required' }, { status: 400 });
    }

    const client = await getShopifyClient(shop);

    const productData = {
      product: {
        title: configuration.title || 'Custom Bottle',
        body_html: configuration.description || '',
        vendor: 'Bottle Configurator',
        product_type: 'Custom Drinkware',
        variants: [
          {
            price: configuration.price?.toString() || '29.99',
            sku: `CUSTOM-${Date.now()}`,
            inventory_management: 'shopify',
          },
        ],
        images: configuration.designImageUrl
          ? [{ src: configuration.designImageUrl }]
          : [],
        metafields: [
          {
            namespace: 'bottle_config',
            key: 'configuration',
            value: JSON.stringify(configuration.configuration || {}),
            type: 'json',
          },
        ],
      },
    };

    const response = await client.post({ path: 'products', data: productData, type: 'application/json' as any });
    const product = (response.body as any).product;

    return NextResponse.json({ product, message: 'Product created successfully' });
  } catch (error: any) {
    console.error('Product creation error:', error);

    if (error.message?.includes('No active session')) {
      return NextResponse.json(
        { error: 'Not authenticated. Please authenticate first.', requiresAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// src/app/api/bottle-types/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getShopifyClientGraphql } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const shop =
      request.nextUrl.searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const client =
      await getShopifyClientGraphql(shop);

    const response = await client.query({
      data: `#graphql
        query GetProducts {
          products(
            first: 50
            query: "product_type:configurator"
          ) {
            nodes {
              id
              title
              handle
              descriptionHtml
              productType
              tags

              featuredMedia {
                mediaContentType

                ... on MediaImage {
                  image {
                    url
                  }
                }
              }

              variants(first: 1) {
                nodes {
                  id
                  price
                }
              }

              media(first: 20) {
                nodes {
                  mediaContentType

                  ... on MediaImage {
                    image {
                      url
                    }
                  }

                  ... on Model3d {
                    sources {
                      url
                      mimeType
                      format
                    }
                  }
                }
              }
            }
          }
        }
      `,
    });

    const data = response.body as any;

    const products =
      data?.data?.products?.nodes ?? [];

    const bottleTypes = {
      bottleTypes: products.map(
        (product: any) => {
          const modelMedia =
            product.media.nodes.find(
              (media: any) =>
                media.mediaContentType ===
                "MODEL_3D"
            );

          const glbSource =
            modelMedia?.sources?.find(
              (source: any) =>
                source.format?.toLowerCase() ===
                  "glb" ||
                source.mimeType ===
                  "model/gltf-binary"
            );

          const image =
            product.featuredMedia
              ?.mediaContentType === "IMAGE"
              ? product.featuredMedia
                  ?.image?.url || ""
              : "";

          return {
            id: product.id,
            name: product.title,
            capacity: "500ml",
            description:
              product.descriptionHtml || "",
            model: glbSource?.url || "",
            image,
            price: Number(
              product.variants?.nodes?.[0]
                ?.price || 0
            ),
            handle: product.handle,
            productType:
              product.productType,
            tags: product.tags,
            variantId:
              product.variants?.nodes?.[0]
                ?.id || "",
          };
        }
      ),
    };

    return NextResponse.json(
      bottleTypes
    );
  } catch (error: any) {
    console.error(
      "Bottle types error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load products",
      },
      { status: 500 }
    );
  }
}
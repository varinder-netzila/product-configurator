// src/app/api/bottle-types/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const shop = process.env.SHOPIFY_STORE_DOMAIN;

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "SHOPIFY_ADMIN_API_TOKEN is not configured",
        },
        { status: 500 }
      );
    }

    const shopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    const graphqlUrl = `https://${shopDomain}/admin/api/2026-07/graphql.json`;

    // ---------------------------------------------------------
    // 1. Get products
    // ---------------------------------------------------------

    const productsQuery = `#graphql
      query GetProducts {
        products(
          first: 50
          query: "tag:configurator"
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
                compareAtPrice
              }
            }

            quantityDiscount: metafield(
              namespace: "custom"
              key: "quantiy_discount"
            ) {
              type
              value
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
    `;

    const productsResponse = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: productsQuery,
      }),
    });

    const productsResult = await productsResponse.json();

    if (!productsResponse.ok) {
      console.error(
        "Shopify products error:",
        productsResult
      );

      return NextResponse.json(
        {
          error: productsResult,
          status: productsResponse.status,
        },
        { status: productsResponse.status }
      );
    }

    if (productsResult.errors) {
      console.error(
        "Shopify GraphQL products errors:",
        productsResult.errors
      );

      return NextResponse.json(
        {
          error: productsResult.errors,
        },
        { status: 500 }
      );
    }

    const products =
      productsResult?.data?.products?.nodes ?? [];

    // ---------------------------------------------------------
    // 2. Get all quantity discount IDs from products
    // ---------------------------------------------------------

    const metaobjectIds = [
      ...new Set(
        products.flatMap((product: any) => {
          try {
            return JSON.parse(
              product.quantityDiscount?.value || "[]"
            );
          } catch {
            return [];
          }
        })
      ),
    ];

    // ---------------------------------------------------------
    // 3. Get all metaobjects in ONE GraphQL request
    // ---------------------------------------------------------

    const discountMap = new Map();

    if (metaobjectIds.length > 0) {
      const metaobjectQuery = `#graphql
        query GetQuantityDiscounts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Metaobject {
              id
              type

              fields {
                key
                value
              }
            }
          }
        }
      `;

      const metaobjectResponse = await fetch(
        graphqlUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: metaobjectQuery,
            variables: {
              ids: metaobjectIds,
            },
          }),
        }
      );

      const metaobjectResult =
        await metaobjectResponse.json();

      if (!metaobjectResponse.ok) {
        console.error(
          "Shopify metaobject error:",
          metaobjectResult
        );

        return NextResponse.json(
          {
            error: metaobjectResult,
            status: metaobjectResponse.status,
          },
          { status: metaobjectResponse.status }
        );
      }

      if (metaobjectResult.errors) {
        console.error(
          "Shopify GraphQL metaobject errors:",
          metaobjectResult.errors
        );

        return NextResponse.json(
          {
            error: metaobjectResult.errors,
          },
          { status: 500 }
        );
      }

      for (
        const item of
          metaobjectResult?.data?.nodes || []
      ) {
        if (!item) continue;

        const fields = Object.fromEntries(
          (item.fields || []).map(
            (field: any) => [
              field.key,
              field.value,
            ]
          )
        );

        discountMap.set(item.id, {
          quantity: fields.quantity || "",
          discount: fields.discount || "",
        });
      }
    }

    // ---------------------------------------------------------
    // 4. Convert Shopify products to bottleTypes
    // ---------------------------------------------------------

    const bottleTypes = {
      bottleTypes: products.map(
        (product: any) => {
          // Find 3D model
          const modelMedia =
            product.media?.nodes?.find(
              (media: any) =>
                media.mediaContentType ===
                "MODEL_3D"
            );

          // Find GLB source
          const glbSource =
            modelMedia?.sources?.find(
              (source: any) =>
                source.format?.toLowerCase() ===
                  "glb" ||
                source.mimeType ===
                  "model/gltf-binary"
            );

          // Featured image
          const image =
            product.featuredMedia
              ?.mediaContentType === "IMAGE"
              ? product.featuredMedia?.image?.url ||
                ""
              : "";

          // Get this product's discount IDs
          let discountIds: string[] = [];

          try {
            discountIds = JSON.parse(
              product.quantityDiscount?.value ||
                "[]"
            );
          } catch {
            discountIds = [];
          }

          // Convert IDs to discount objects
          const discounts = discountIds
            .map((id: string) =>
              discountMap.get(id)
            )
            .filter(Boolean);

          return {
            id: product.id,

            name: product.title,

            capacity: "500ml",

            description:
              product.descriptionHtml || "",

            model:
              glbSource?.url || "",

            image,

            discounts,

            price: Number(
              product.variants?.nodes?.[0]
                ?.price || 0
            ),

            compareAtPrice: Number(
              product.variants?.nodes?.[0]
                ?.compareAtPrice || 0
            ),

            handle: product.handle,

            components: [
              "Body",
              "Frame",
            ],

            materials: {
              Body: "Board",
              Frame: "Plastic",
            },

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

    // ---------------------------------------------------------
    // 5. Return bottle types
    // ---------------------------------------------------------

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
          error?.message ||
          "Failed to load products",
      },
      { status: 500 }
    );
  }
}
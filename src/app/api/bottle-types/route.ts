// src/app/api/bottle-types/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getShopifyClientGraphql } from "@/lib/shopify";
import { Component } from "react";

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
  `,
});
    const data = response.body as any;

    const products =
      data?.data?.products?.nodes ?? [];

// 2. Get all quantity discount IDs from products
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

// 3. Get all metaobjects in ONE GraphQL request
const metaobjectResponse = await client.query({
  data: {
    query: `#graphql
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
    `,
    variables: {
      ids: metaobjectIds,
    },
  },
});

// 4. Create lookup map
const discountMap = new Map();

for (const item of metaobjectResponse.body.data.nodes || []) {
  if (!item) continue;

  const fields = Object.fromEntries(
    (item.fields || []).map((field: any) => [
      field.key,
      field.value,
    ])
  );

  discountMap.set(item.id, {
    quantity: fields.quantity || "",
    discount: fields.discount || "",
  });
}

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
      // Get this product's discount IDs
      const discountIds = JSON.parse(
        product.quantityDiscount?.value || "[]"
      );

      // Convert IDs to the actual discount objects
      const discounts = discountIds
        .map((id: string) => discountMap.get(id))
        .filter(Boolean);
        
          return {
            id: product.id,
            name: product.title,
            capacity: "500ml",
            description:
              product.descriptionHtml || "",
            model: glbSource?.url || "",
            image,
            discounts,
            price: Number(
              product.variants?.nodes?.[0]
                ?.price || 0
            ),
            compareAtPrice: Number(
              product.variants?.nodes?.[0]?.compareAtPrice || 0
            ),
            handle: product.handle,
            components: ["Body", "Frame"],
            materials: {
              "Body": "Board",
              "Frame": "Plastic"
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
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getShopifyClientGraphql } from "@/lib/shopify"; // use your actual import

export async function POST(request: NextRequest) {
  try {
    const { shop } = await request.json();

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

const client = await getShopifyClientGraphql(shop);
 const response = await client.query({
  data: `#graphql
    query GetProducts {
      products(
        first: 10
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
      bottleTypes: products.map((product: any) => {

        // Main product image
        const imageMedia = product.media.nodes.find(
          (media: any) =>
            media.mediaContentType === "IMAGE"
        );

        // 3D GLB model
        const modelMedia = product.media.nodes.find(
          (media: any) =>
            media.mediaContentType === "MODEL_3D"
        );
    const image =
      product.featuredMedia?.mediaContentType === "IMAGE"
        ? product.featuredMedia?.image?.url || ""
        : "";
    //console.log('img_url', image);    
    const glbSource =
      modelMedia?.sources?.find(
        (source: any) =>
          source.format?.toLowerCase() === "glb" ||
          source.mimeType === "model/gltf-binary"
      );
  
        return {
          id: product.id,

          name: product.title,

          capacity: "500ml",

          description:
            product.descriptionHtml || "",

          // Shopify hosted GLB URL
          model:
            glbSource?.url || "",

          // Shopify main product image
          image:
            image || "",

          star_rating: 4.5,

          components: [
            "bottle",
            "lid",
            "ring",
          ],

          materials: {
            bottle: "Stainless steel",
            lid: "Stainless steel",
            ring: "Plastic",
          },

          size: {
            width: 221.56,
            height: 238,
            unit: "mm",
          },

          price: Number(
            product.variants?.nodes?.[0]?.price || 0
          ),

          handle: product.handle,

          productType:
            product.productType,

          tags:
            product.tags,

          variantId:
            product.variants?.nodes?.[0]?.id || "",
        };
      }),
    };

    const filePath = path.join(
      process.cwd(),
      "src",
      "data",
      "bottleTypes.json"
    );

    await fs.writeFile(
      filePath,
      JSON.stringify(
        bottleTypes,
        null,
        2
      ),
      "utf8"
    );

    return NextResponse.json({
      success: true,
      count:
        bottleTypes.bottleTypes.length,
      products:
        bottleTypes.bottleTypes,
    });

  } catch (error: any) {

    console.error(
      "SYNC PRODUCTS ERROR:",
      error
    );

    if (
      error.message?.includes(
        "No active session"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Shopify session not found",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to sync products",
      },
      { status: 500 }
    );
  }
}
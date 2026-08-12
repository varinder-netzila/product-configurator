import { NextRequest, NextResponse } from "next/server";

interface GenerateBody {
  clubName?: string;
  primaryColor: string;
  secondaryColor: string;
  jerseyPattern: string;
  stripeCount?: number;
  /** Product circumference / height. Used to pick the closest supported AI size. */
  aspectRatio?: number;
  quality?: "standard" | "hd";
}

/**
 * gpt-image-1 only supports three sizes. Pick the one whose aspect best
 * matches the product so the texture wraps without distortion.
 */
function pickImageSize(aspectRatio: number): "1024x1024" | "1536x1024" | "1024x1536" {
  const a = aspectRatio || 1;
  const candidates: Array<{ size: "1024x1024" | "1536x1024" | "1024x1536"; ratio: number }> = [
    { size: "1024x1024", ratio: 1.0 },
    { size: "1536x1024", ratio: 1.5 },
    { size: "1024x1536", ratio: 1 / 1.5 },
  ];
  let best = candidates[0];
  for (const c of candidates) {
    if (Math.abs(c.ratio - a) < Math.abs(best.ratio - a)) best = c;
  }
  return best.size;
}

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  solid: "a single solid colour, no stripes or patterns",
  "stripes-vertical": "alternating vertical stripes (the two colours alternating top-to-bottom along the body of the shirt)",
  hoops: "alternating horizontal hoops/bands across the chest",
  diagonal: "a single wide diagonal stripe from one shoulder to the opposite hip",
  halves: "split into two vertical halves, each half a different colour",
  sash: "a single contrasting sash diagonally across the chest",
  chevron: "a V-shaped chevron band across the chest",
};

function buildPrompt(b: GenerateBody): string {
  const reference = b.clubName
    ? `the most recent home kit of ${b.clubName} football club`
    : `a modern football kit using primary colour ${b.primaryColor} and secondary colour ${b.secondaryColor}`;

  return `Create a highly realistic flat 360-degree wrap print design based on ${reference}.

Transform the football kit into one continuous flat print that can wrap seamlessly around a bottle or mug. The design must be a clean, realistic, print-ready interpretation of the actual football shirt and shorts.

This is a UV texture wrap. The kit pattern and colour must cover the entire canvas — top to bottom, left to right, all four edges. Treat the canvas as a printed wrap label where colour bleeds to every edge. Do NOT leave any white, beige, grey or empty margins.

Layout rules:

The full design must be a vertical flat print covering the entire canvas.
The top 60% of the canvas height represents the football shirt; colour starts at the top edge.
The bottom 40% of the canvas height represents the football shorts; colour continues to the bottom edge.
The left half of the canvas (left 50% width) shows the front side of the shirt and shorts.
The right half of the canvas (right 50% width) shows the back side of the shirt and shorts.
The left and right outer edges must connect seamlessly, so the design can be wrapped 360 degrees around a cylindrical product.

Important design interpretation:

Use ${reference} as the exact visual reference for:

club colors (exact hex / Pantone match)
shirt pattern (exact stripe widths, hoop spacing, panel layout)
graphic details (gradients, tonal patterns, sublimated graphics, modern design accents)
shorts color
shorts details (trim, side panels, colour blocking)
overall visual identity of the kit

The design must look like a realistic flat-print version of the actual kit, but it must not look like a physical shirt or shorts.

ABSOLUTELY NO:

club badge or crest
sponsor logos or sponsor text
manufacturer logos (no Nike swoosh, no Adidas stripes, no Puma cat, no New Balance, no Hummel chevrons, etc.)
brand wordmarks anywhere
player names
shirt numbers
any text or typography at all
any drawing of an emblem or symbol on either chest or shorts

The print must be PURE COLOUR AND PATTERN, taken from the kit, with all logos, crests, and sponsors REMOVED — as if a clean blank product version of the kit.

Front and back continuation:

The LEFT half is the front of the kit; the RIGHT half is the back. Both halves must show the same colours, same stripes/pattern continuation, and same panel layout as the real kit. Where the kit normally has a sponsor or name/number on the back, leave that area as plain matching colour.

Very important — DO NOT include:

sleeves
collar
neck opening
seams
stitches
fabric folds
shadows of clothing
3D shirt shape
3D shorts shape
mannequin shape
human body shape
wrinkles
clothing texture that makes it look like a garment
buttons
zippers
labels
hems
side panels as raised fabric

This must be a flat graphic print, not a garment mockup.

Style — make it more REALISTIC, not cartoony:

Render with subtle, realistic colour depth — not flat solid blocks. Include the gentle tonal variation, depth and finish you'd see on a premium photographed kit (subtle gradient transitions, slight micro-pattern in the fabric tone) WITHOUT introducing visible weave, mesh, or stitching detail.
Pin-sharp colour boundaries between stripes / panels. Modern, high-end sports apparel design language.
Studio-quality lighting feel — even, neutral, with no garment shadows or folds. The result should look like a high-resolution flat artwork prepared for a sublimation print on a bottle.

No background. No product mockup. No bottle. No mug. Only the flat print design covering the full canvas.`;
}

async function uploadDataUrlToImageKit(dataUrl: string): Promise<string | null> {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  if (!privateKey) return null;
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
  const auth = Buffer.from(`${privateKey}:`).toString("base64");
  const formData = new FormData();
  formData.append("file", base64);
  formData.append("fileName", `jersey-ai-${Date.now()}.png`);
  formData.append("folder", "/bottle-designs/jerseys/");
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url || null;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as GenerateBody | null;
    if (!body || !body.primaryColor || !body.secondaryColor || !body.jerseyPattern) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = buildPrompt(body);
    const quality = body.quality === "hd" ? "hd" : "standard";
    const size = pickImageSize(body.aspectRatio ?? 1);

    // Call gpt-image-1 directly via REST (no SDK dependency).
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size, // matches the product's aspect ratio (1024x1024 for bottles, 1536x1024 for mug/tumbler)
        quality: quality === "hd" ? "high" : "medium",
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI image error:", errText);
      return NextResponse.json(
        { error: `OpenAI: ${openaiRes.status} ${errText.slice(0, 300)}` },
        { status: 500 },
      );
    }

    const openaiData = await openaiRes.json();
    // gpt-image-1 returns b64_json by default
    const b64: string | undefined = openaiData?.data?.[0]?.b64_json;
    const revisedPrompt = openaiData?.data?.[0]?.revised_prompt;
    if (!b64) {
      return NextResponse.json({ error: "OpenAI returned no image" }, { status: 502 });
    }
    const dataUrl = `data:image/png;base64,${b64}`;

    // Try to persist to ImageKit (so the texture survives Vercel serverless cold starts)
    const hostedUrl = await uploadDataUrlToImageKit(dataUrl);

    return NextResponse.json({
      imageUrl: hostedUrl || dataUrl, // prefer the hosted URL but fall back to the data URL
      revisedPrompt,
      hosted: !!hostedUrl,
    });
  } catch (err: any) {
    console.error("Jersey generate-image error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

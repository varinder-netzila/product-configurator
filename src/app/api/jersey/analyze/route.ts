import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PATTERNS = [
  "solid",
  "stripes-vertical",
  "hoops",
  "diagonal",
  "halves",
  "sash",
  "chevron",
] as const;

const SUB_PATTERNS = [
  "none",
  "diagonal-gradient",
  "vertical-fade",
  "color-block",
  "geometric-mesh",
] as const;

const SUB_DIRECTIONS = [
  "none",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

const SYSTEM_PROMPT = `You are a football kit expert. Analyse the request and return ONLY a valid JSON object — no markdown, no explanation.

UNKNOWN CLUB HANDLING — read this first:
If you cannot confidently identify the named club's actual home kit (e.g. the
name is unfamiliar, looks like an amateur / local / fake / made-up team, or
you don't know the colours and pattern with reasonable certainty), respond
ONLY with:

{
  "unknown": true,
  "reason": "Could not confidently identify the home kit for this club"
}

Do NOT fabricate colours, patterns, or details for unknown clubs.

For clubs you DO recognise, return the FULL kit object with exactly these fields:

{
  "primaryColor": "#RRGGBB",
  "secondaryColor": "#RRGGBB",
  "accentColor": "#RRGGBB",
  "shortsColor": "#RRGGBB",
  "textColor": "#000000",
  "jerseyPattern": "<pattern>",
  "shortsPattern": "<pattern>",
  "stripeCount": <number>,
  "subPattern": "<sub-pattern>",
  "subPatternDirection": "<direction>"
}

JERSEY PATTERN — the BASE pattern, pick the single best match:
- solid            = one flat colour, no stripes (Brazil yellow, Netherlands orange, Germany white)
- stripes-vertical = alternating vertical colour stripes (Argentina sky+white, Barcelona red+blue, Inter black+blue)
- hoops            = alternating horizontal bands (Celtic green+white, QPR blue+white, Brentford red+white)
- halves           = left half one colour / right half another (Ajax red+white vertical split)
- sash             = one diagonal band from shoulder to opposite hip (River Plate red band)
- diagonal         = single wide diagonal stripe across the chest
- chevron          = V-shape band across the chest

SHORTS PATTERN — almost always "solid".

stripeCount = number of colour PAIRS visible (1 primary stripe + 1 secondary stripe = 1 pair):
- 2   = very wide, few stripes (Argentina: 3 wide pairs)
- 3-5 = medium (Barcelona blaugrana: ~5 pairs)
- 6-10 = narrow (Inter Milan, Celtic hoops: 8-10 pairs)
- 12-18 = pinstripes (Juventus fine stripes)
For non-stripe patterns (solid/halves/sash/diagonal/chevron) set stripeCount to 4.

SUB-PATTERN — an OVERLAY effect on top of the base pattern. Modern kits often
combine a classic base (stripes/hoops/solid) with a unique overlay graphic.
Pick the best match:
- none             = no overlay, the base pattern is clean (most classic kits)
- diagonal-gradient= a soft diagonal colour sweep across the chest (Barcelona 2025-26 has this; gradient from darker primary in one corner to lighter primary in the opposite corner — visually creates a swoosh)
- vertical-fade    = the colour fades vertically top-to-bottom (modern shorts often have this on jerseys too)
- color-block      = a bold colour block in one zone (e.g. shoulder yoke in a different colour, or chest panel in a different colour)
- geometric-mesh   = a subtle repeating geometric pattern (hexagonal mesh, dot mesh, diamond mesh — sublimated and low contrast)

subPatternDirection (only meaningful for diagonal-gradient / color-block):
- "none"            = no direction (used when subPattern is "none", "vertical-fade", "geometric-mesh")
- "top-left"        = gradient/block originates from top-left, fading toward bottom-right
- "top-right"       = top-right → bottom-left
- "bottom-left"     = bottom-left → top-right
- "bottom-right"    = bottom-right → top-left

primaryColor   = the colour covering the MOST area on the jersey.
secondaryColor = second most prominent colour on the jersey.
accentColor    = a third trim / accent colour used somewhere on the kit (collar, cuffs, side panel, sleeve trim, sponsor highlight). Often gold, silver, black or white. If the kit only uses two colours, repeat the secondary colour here.
shortsColor    = dominant colour of the shorts.
textColor      = always "#000000" (will be overridden automatically).
All hex values: exact 6-digit lowercase starting with #, e.g. #a50044.`;

/** Download any image URL server-side and return it as a base64 data URL. */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "IZY-Bottle-Configurator/1.0 (jim@izybottles.com)" },
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Fetch a club's logo from Wikipedia.
 * 1. Use Wikipedia's opensearch to find the article matching the club name.
 * 2. Use Wikipedia's pageimages API to get the main page image (usually the crest).
 * Returns a base64 data URL or null.
 */
/**
 * Resolve a club name to its main Wikipedia article title. Skips obvious
 * non-club hits (seasons, players, stadiums, etc.). Returns null if nothing
 * useful is found.
 */
async function findClubWikipediaTitle(clubName: string): Promise<string | null> {
  // If user didn't already specify "FC" / "football club", append it so Wikipedia's
  // search doesn't return the city/country article instead of the football club.
  const lowerClub = clubName.toLowerCase();
  const alreadyFootball = /\b(f\.?c\.?|fc|football\s*club|afc|sc|cf)\b/.test(lowerClub);
  const searchQuery = alreadyFootball ? clubName : `${clubName} football club`;

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srlimit=8&format=json&origin=*`;
  const searchRes = await fetch(searchUrl, {
    next: { revalidate: 86400 },
    headers: { "User-Agent": "IZY-Bottle-Configurator/1.0 (jim@izybottles.com)" },
  });
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const results: Array<{ title: string; snippet: string }> = searchData?.query?.search ?? [];
  if (results.length === 0) return null;

  const isJunk = (t: string) =>
    /disambiguation/i.test(t) ||
    /\bseason\b|\b(19|20)\d{2}(?:[–\-]\d{2})?\b/i.test(t) ||
    /\b(squad|player|manager|stadium|history of|list of|kit|reserves?|youth|women|under-\d+)\b/i.test(t);
  const filtered = results.filter((r) => !isJunk(r.title));
  return (filtered[0] ?? results[0])?.title ?? null;
}

async function fetchClubLogoFromWikipedia(clubName: string): Promise<string | null> {
  try {
    const log = (_msg: string) => { /* console.log(`[wiki-logo:${clubName}] ${_msg}`); */ };
    const title = await findClubWikipediaTitle(clubName);
    log(`picked title=${title}`);
    if (!title) return null;

    // Step 2: fetch the page's main image
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=500&format=json&origin=*&titles=${encodeURIComponent(title)}`;
    const imgRes = await fetch(imgUrl, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "IZY-Bottle-Configurator/1.0 (jim@izybottles.com)" },
    });
    let thumbSource: string | undefined;
    if (imgRes.ok) {
      const imgData = await imgRes.json();
      const pages = imgData?.query?.pages;
      const firstPage: any = pages ? Object.values(pages)[0] : null;
      thumbSource = firstPage?.thumbnail?.source;
    }
    log(`pageimages thumbSource=${thumbSource || "(none)"}`);

    // Fallback: REST summary endpoint often has thumbnails even when pageimages doesn't.
    if (!thumbSource) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      const summaryRes = await fetch(summaryUrl, {
        next: { revalidate: 86400 },
        headers: { "User-Agent": "IZY-Bottle-Configurator/1.0 (jim@izybottles.com)" },
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        thumbSource = summaryData?.originalimage?.source || summaryData?.thumbnail?.source;
        log(`summary fallback thumbSource=${thumbSource || "(none)"}`);
      }
    }
    if (!thumbSource) return null;

    const result = await toDataUrl(thumbSource);
    log(`toDataUrl result: ${result ? "OK (" + result.length + " bytes)" : "FAILED"}`);
    return result;
  } catch (err) {
    console.log(`[wiki-logo:${clubName}] ERROR:`, err);
    return null;
  }
}

type KitVariant = "home" | "away" | "third";

/**
 * Find a kit body image on Wikipedia.
 *
 * Football club articles include an Infobox with template parameters like
 *   | pattern_b1 = _fcb2526h    (1 = home)
 *   | pattern_b2 = _fcb2526a    (2 = away)
 *   | pattern_b3 = _fcb2526t    (3 = third)
 * where the value is the file name suffix. The actual image lives at
 *   File:Kit body fcb2526h.png  (or .svg)
 *
 * Returns a base64 data URL of the requested kit body image, or null if
 * anything goes wrong (article not found, no infobox, variant empty,
 * file missing).
 */
async function fetchKitBodyFromWikipedia(
  clubName: string,
  variant: KitVariant = "home",
): Promise<{ dataUrl: string; patternName: string } | null> {
  try {
    const title = await findClubWikipediaTitle(clubName);
    if (!title) return null;

    // Step 1: fetch the article's wikitext to read the Infobox.
    const wtUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&origin=*`;
    const wtRes = await fetch(wtUrl, {
      next: { revalidate: 21600 }, // 6h cache — kits change once per year so we don't need fresher
      headers: { "User-Agent": "IZY-Bottle-Configurator/1.0 (jim@izybottles.com)" },
    });
    if (!wtRes.ok) return null;
    const wtData = await wtRes.json();
    const wikitext: string = wtData?.parse?.wikitext?.["*"] ?? "";
    if (!wikitext) return null;

    // Step 2: pull the kit body pattern for the requested variant.
    //   home  → pattern_b1
    //   away  → pattern_b2
    //   third → pattern_b3
    const variantSlot = variant === "home" ? "1" : variant === "away" ? "2" : "3";
    const m = wikitext.match(new RegExp(`\\bpattern_b${variantSlot}\\s*=\\s*([^\n|}]+)`, "i"));
    if (!m) return null;
    let patternRaw = m[1].trim();
    if (!patternRaw) return null;
    // Strip a leading underscore — file names don't have it.
    const patternName = patternRaw.replace(/^_/, "").trim();
    if (!patternName) return null;

    // Step 3: try the file under both PNG and SVG extensions, in that order.
    // Football kit images live on Wikimedia Commons (shared repo) so the
    // English-Wikipedia page will report "missing" — we can still get a real
    // URL via imageinfo as long as imagerepository is set or imageinfo has
    // a URL. So we just check for a usable imageinfo.url.
    const candidates = [`Kit body ${patternName}.png`, `Kit body ${patternName}.svg`];
    for (const filename of candidates) {
      const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + filename)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const infoRes = await fetch(infoUrl, {
        next: { revalidate: 86400 },
        headers: { "User-Agent": "IZY-Bottle-Configurator/1.0 (jim@izybottles.com)" },
      });
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const pages = infoData?.query?.pages;
      const firstPage: any = pages ? Object.values(pages)[0] : null;
      const directUrl: string | undefined = firstPage?.imageinfo?.[0]?.url;
      if (!directUrl) continue;
      const dataUrl = await toDataUrl(directUrl);
      if (dataUrl) return { dataUrl, patternName };
    }
    return null;
  } catch (err) {
    console.log(`[wiki-kit:${clubName}] ERROR:`, err);
    return null;
  }
}

/** Return #ffffff or #000000 — whichever is more legible on the given hex colour. */
function contrastColor(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#000000";
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? "#000000" : "#ffffff";
}

type KitParseResult =
  | { type: "kit"; data: Record<string, string> }
  | { type: "unknown"; reason: string }
  | { type: "invalid"; raw: string };

/**
 * Parse Claude's response, being lenient about extra whitespace / backticks.
 * Distinguishes three cases:
 *   - "kit"     → all required fields present, normal flow
 *   - "unknown" → Claude explicitly said it doesn't know the club
 *   - "invalid" → could not parse / required fields missing
 */
function parseKitJson(raw: string): KitParseResult {
  const cleaned = raw.trim().replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
  const tryParse = (s: string): any => {
    try { return JSON.parse(s); } catch { return null; }
  };
  let parsed = tryParse(cleaned);
  if (!parsed) {
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    return { type: "invalid", raw };
  }
  if (parsed.unknown === true) {
    return { type: "unknown", reason: String(parsed.reason ?? "Unknown club") };
  }
  const required = ["primaryColor", "secondaryColor", "shortsColor", "textColor", "jerseyPattern", "shortsPattern"];
  if (required.every((k) => k in parsed)) {
    return { type: "kit", data: parsed };
  }
  return { type: "invalid", raw };
}

export async function POST(req: NextRequest) {
  try {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured in .env.local" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.mode) {
    return NextResponse.json({ error: "Missing mode" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // ── Mode: club name ─────────────────────────────────────────────────────────
  // Workflow:
  //   1. Look up the club's Wikipedia article and pull the home kit body
  //      image (pattern_b1). Same lookup also gets the crest.
  //   2. If the kit image is found → Claude vision analyses the actual
  //      current pattern (much richer than text-only knowledge).
  //   3. Otherwise fall back to text-only Claude analysis from kit knowledge.
  if (body.mode === "club") {
    const clubName = (body.clubName as string)?.trim();
    if (!clubName) return NextResponse.json({ error: "Missing clubName" }, { status: 400 });

    // Validate kit variant — defaults to home if missing or invalid.
    const rawVariant = (body.kitVariant as string)?.toLowerCase();
    const kitVariant: KitVariant =
      rawVariant === "away" ? "away" : rawVariant === "third" ? "third" : "home";

    // Run the two Wikipedia fetches in parallel — they're independent.
    const [logoDataUrl, kitBody] = await Promise.all([
      fetchClubLogoFromWikipedia(clubName),
      fetchKitBodyFromWikipedia(clubName, kitVariant),
    ]);

    let message: Anthropic.Message;
    let visionSource: string | null = null;

    if (kitBody) {
      // Vision path — analyse the actual current kit image.
      const match = kitBody.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const [, mime, b64] = match;
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
        const safeMime = (validTypes as readonly string[]).includes(mime)
          ? (mime as typeof validTypes[number])
          : "image/png";
        visionSource = `Wikipedia ${kitVariant} kit body pattern: ${kitBody.patternName}`;
        message = await client.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: safeMime, data: b64 },
              },
              {
                type: "text",
                text: `This is the official ${clubName} ${kitVariant} kit body pattern image from the Wikipedia infobox (pattern code ${kitBody.patternName}). Analyse it carefully and extract the colours and pattern. Pay attention to: (1) the dominant and secondary stripe / hoop / colour-block colours, (2) any trim or accent colour on the collar, cuffs or sleeve, (3) the number of stripe pairs if striped. Return ONLY the JSON object specified.`,
              },
            ],
          }],
        });
      } else {
        // Malformed data URL — fall through to text mode.
        message = await client.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Describe the most recent ${kitVariant} kit for "${clubName}" football club — jersey pattern, primary/secondary/accent colours, shorts colour, stripe count. Return ONLY the JSON object specified.`,
          }],
        });
      }
    } else {
      // No kit image — text-only path. Reminds Claude which variant.
      message = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Describe the most recent ${kitVariant} kit for "${clubName}" football club — jersey pattern, primary/secondary/accent colours, shorts colour, stripe count. Return ONLY the JSON object specified.`,
        }],
      });
    }

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseKitJson(raw);

    if (parsed.type === "unknown") {
      // Claude explicitly said it doesn't know this club — refuse to
      // fabricate. Returns 404 with a friendly message the UI can show.
      return NextResponse.json(
        {
          error: `Couldn't find a real home kit for "${clubName}". Check the spelling or try the full official name (e.g. "FC Barcelona", "Manchester United").`,
        },
        { status: 404 },
      );
    }
    if (parsed.type === "invalid") {
      return NextResponse.json({ error: "Could not parse kit data from AI response", raw }, { status: 502 });
    }
    const kit = parsed.data;

    // Validate pattern values and stripeCount
    for (const field of ["jerseyPattern", "shortsPattern"] as const) {
      if (!PATTERNS.includes(kit[field] as typeof PATTERNS[number])) {
        kit[field] = "solid";
      }
    }
    const rawCount = Number(kit["stripeCount"]);
    kit["stripeCount"] = String(isFinite(rawCount) ? Math.max(1, Math.min(20, Math.round(rawCount))) : 5);
    // Default accentColor to secondary if Claude omitted it (older response format)
    if (!kit["accentColor"]) kit["accentColor"] = kit["secondaryColor"] ?? "#ffffff";
    // Validate sub-pattern + direction (default to none)
    if (!SUB_PATTERNS.includes(kit["subPattern"] as typeof SUB_PATTERNS[number])) {
      kit["subPattern"] = "none";
    }
    if (!SUB_DIRECTIONS.includes(kit["subPatternDirection"] as typeof SUB_DIRECTIONS[number])) {
      kit["subPatternDirection"] = "none";
    }
    // Always compute text colour from primary — never trust the AI to get legibility right
    kit["textColor"] = contrastColor(kit["primaryColor"] ?? "#ffffff");

    return NextResponse.json({
      kit,
      clubLogoUrl: logoDataUrl,
      // The kit body image is used by Claude vision for analysis only —
      // we deliberately do NOT return it as a visual base, because the
      // Wikipedia kit images are ~200px wide and look pixelated when
      // scaled up onto the bottle. Instead Claude extracts a richer
      // pattern spec (subPattern, gradient direction, etc.) and the
      // renderer reconstructs the design parametrically at full
      // resolution. See kit.subPattern.
      jerseyBaseImageUrl: null,
      visionSource, // tells the UI whether vision-based analysis was used
    });
  }

  // ── Mode: image upload ───────────────────────────────────────────────────────
  if (body.mode === "image") {
    const { imageBase64, mimeType } = body as { imageBase64: string; mimeType: string };
    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "Missing imageBase64 or mimeType" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    const safeMime = validTypes.includes(mimeType as typeof validTypes[number])
      ? (mimeType as typeof validTypes[number])
      : "image/jpeg";

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: safeMime, data: imageBase64 },
            },
            {
              type: "text",
              text: "Analyse this football jersey image and extract the kit colours and pattern.",
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseKitJson(raw);

    if (parsed.type === "unknown") {
      return NextResponse.json(
        { error: "Could not recognise a football kit in the uploaded image. Try a clearer photo of the front of the shirt." },
        { status: 404 },
      );
    }
    if (parsed.type === "invalid") {
      return NextResponse.json({ error: "Could not parse kit data from AI response", raw }, { status: 502 });
    }
    const kit = parsed.data;

    for (const field of ["jerseyPattern", "shortsPattern"] as const) {
      if (!PATTERNS.includes(kit[field] as typeof PATTERNS[number])) {
        kit[field] = "solid";
      }
    }
    const rawCount2 = Number(kit["stripeCount"]);
    kit["stripeCount"] = String(isFinite(rawCount2) ? Math.max(1, Math.min(20, Math.round(rawCount2))) : 5);
    if (!kit["accentColor"]) kit["accentColor"] = kit["secondaryColor"] ?? "#ffffff";
    if (!SUB_PATTERNS.includes(kit["subPattern"] as typeof SUB_PATTERNS[number])) {
      kit["subPattern"] = "none";
    }
    if (!SUB_DIRECTIONS.includes(kit["subPatternDirection"] as typeof SUB_DIRECTIONS[number])) {
      kit["subPatternDirection"] = "none";
    }
    kit["textColor"] = contrastColor(kit["primaryColor"] ?? "#ffffff");

    return NextResponse.json({ kit, clubLogoUrl: null });
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (err: any) {
    console.error("Jersey analyze error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

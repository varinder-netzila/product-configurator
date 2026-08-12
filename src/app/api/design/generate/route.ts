import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a world-class graphic designer creating premium water bottle wrap designs as SVG.

The user will describe what they want. Create 6 dramatically different SVG designs based on their description. Each SVG wraps around a cylindrical bottle (1024x1024).

Return ONLY a valid JSON object:
{
  "designs": [
    {"name": "Design Name", "svg": "<svg viewBox=\\"0 0 1024 1024\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"},
    ... (6 total)
  ]
}

SVG RULES:
- Each SVG must have viewBox="0 0 1024 1024"
- The left and right edges meet when wrapped around a cylinder
- Design 6 DRAMATICALLY different interpretations of the user's description
- Vary: color palettes, layouts, typography, density, style (minimal vs maximal)
- Use <defs> for gradients, patterns, clip paths — make designs rich and layered
- Use transforms, opacity for depth and interest
- Include text only if the description mentions specific text
- Think about what would look stunning on an actual product
- Each design should feel like it came from a different designer
- NO external images or xlink:href
- Keep SVGs concise but visually impressive`;

function parseJson(text: string): any {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const TIMEOUT_MS = 60000; // 60 second timeout
    const MAX_RETRIES = 2;

    let message: any = null;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const messagePromise = client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Create 6 bottle wrap designs based on this description: "${prompt.trim()}"`,
          }],
        });

        message = await Promise.race([
          messagePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Design generation timeout (60s)')), TIMEOUT_MS)
          ),
        ]) as any;

        lastError = null;
        break;
      } catch (error: any) {
        lastError = error;
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`Design generation attempt ${attempt + 1} failed, retrying...`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        }
      }
    }

    if (lastError || !message) {
      throw lastError || new Error('Failed to generate designs');
    }

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const parsed = parseJson(responseText);

    if (!parsed || !parsed.designs) {
      return NextResponse.json({ error: 'Failed to generate designs', raw: responseText?.substring(0, 500) }, { status: 500 });
    }

    let designs = Array.isArray(parsed.designs) ? parsed.designs : [];
    designs = designs
      .filter((d: any) => d && d.name && d.svg && d.svg.includes('<svg'))
      .slice(0, 6)
      .map((d: any) => ({
        name: d.name,
        svg: d.svg,
        imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(d.svg).toString('base64')}`,
      }));

    return NextResponse.json({ designs });
  } catch (error: any) {
    console.error('Design generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate designs' }, { status: 500 });
  }
}

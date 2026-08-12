import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a world-class brand designer. The user has uploaded their brand/style guide as a PDF. Study every page carefully and extract:

1. Brand identity: name, tagline, brand values, tone of voice
2. Colors: exact hex codes for primary, secondary, accent, and any other brand colors
3. Typography: font families, weights, usage rules
4. Logo: usage guidelines, clear space rules, color variations
5. Visual style: patterns, imagery style, graphic elements, shapes
6. Do's and don'ts: any specific design rules

Then create 6 unique bottle wrap designs (SVG, 1024x1024) that STRICTLY follow the brand guide.

Return ONLY valid JSON:
{
  "companyName": "string",
  "tagline": "string — max 60 chars",
  "industry": "string",
  "primaryColor": "#rrggbb",
  "secondaryColor": "#rrggbb",
  "accentColor": "#rrggbb",
  "fontFamily": "Google Fonts name closest to the brand's font",
  "designs": [
    {"name": "Design Name", "svg": "<svg viewBox=\\"0 0 1024 1024\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"},
    ... (6 total)
  ]
}

SVG DESIGN RULES:
- Each SVG must have viewBox="0 0 1024 1024" — wraps around a cylindrical bottle
- STRICTLY follow the brand guide's color palette — use only the colors specified
- Match the brand's visual language: if the guide uses geometric shapes, use those
- Respect logo clear space rules from the guide
- Include <!-- LOGO_AREA cx="X" cy="Y" size="S" --> comment for logo placement (coordinates 0-1024)
- Include the company name as text using the brand's typography style
- Each design should be dramatically different but ALL must feel on-brand
- Use <defs> for gradients, patterns, clip paths
- NO external images or xlink:href`;

function parseJson(text: string): any {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Convert PDF to base64
    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');

    const client = new Anthropic({ apiKey });

    // Send PDF directly to Claude as a document
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          } as any,
          {
            type: 'text',
            text: 'This is the company\'s brand/style guide. Study it carefully — extract ALL brand guidelines, exact colors, typography, and visual rules. Then create 6 bottle wrap designs that strictly follow this guide.',
          },
        ],
      }],
    });

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const parsed = parseJson(responseText);

    if (!parsed || !parsed.companyName) {
      return NextResponse.json({ error: 'Failed to analyze brand guide', raw: responseText?.substring(0, 500) }, { status: 500 });
    }

    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    if (!hexRegex.test(parsed.primaryColor)) parsed.primaryColor = '#1a1a2e';
    if (!hexRegex.test(parsed.secondaryColor)) parsed.secondaryColor = '#16213e';
    if (!hexRegex.test(parsed.accentColor)) parsed.accentColor = '#e94560';

    let designs = Array.isArray(parsed.designs) ? parsed.designs : [];
    designs = designs
      .filter((d: any) => d && d.name && d.svg && d.svg.includes('<svg'))
      .slice(0, 6)
      .map((d: any) => ({
        name: d.name,
        svg: d.svg,
        imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(d.svg).toString('base64')}`,
      }));

    return NextResponse.json({
      brand: {
        companyName: parsed.companyName,
        tagline: parsed.tagline || '',
        industry: parsed.industry || 'other',
        primaryColor: (parsed.primaryColor || '#1a1a2e').toLowerCase(),
        secondaryColor: (parsed.secondaryColor || '#16213e').toLowerCase(),
        accentColor: (parsed.accentColor || '#e94560').toLowerCase(),
        fontFamily: parsed.fontFamily || 'Inter',
        brandPersonality: '',
        logoUrl: null,
        websiteUrl: '',
      },
      designs,
      logoDataUrl: null,
    });
  } catch (error: any) {
    console.error('Brand guide analysis error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze brand guide' }, { status: 500 });
  }
}

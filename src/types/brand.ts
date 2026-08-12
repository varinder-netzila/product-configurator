export interface BrandIdentity {
  companyName: string;
  tagline: string;
  industry: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  brandPersonality: string;
  logoUrl: string | null;
  websiteUrl: string;
}

export interface BrandDesign {
  name: string;
  imageDataUrl: string;
  svg?: string; // raw SVG source for logo placement parsing
}

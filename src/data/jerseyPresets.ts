export type JerseyPattern =
  | "solid"
  | "stripes-vertical"
  | "stripes-horizontal"
  | "hoops"
  | "diagonal"
  | "halves"
  | "sash"
  | "chevron";

export interface JerseyFont {
  id: string;
  label: string;
  /** CSS font-family value used in both canvas ctx.font and CSS font-family */
  family: string;
  /** CSS font-weight used in canvas ctx.font */
  weight: string;
  /** Google Fonts stylesheet URL; undefined = system font, no loading needed */
  googleUrl?: string;
}

export const JERSEY_FONTS: JerseyFont[] = [
  {
    id: "bebas",
    label: "Bebas Neue",
    family: '"Bebas Neue", Impact, sans-serif',
    weight: "400",
    googleUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
  },
  {
    id: "anton",
    label: "Anton",
    family: '"Anton", Impact, sans-serif',
    weight: "400",
    googleUrl: "https://fonts.googleapis.com/css2?family=Anton&display=swap",
  },
  {
    id: "oswald",
    label: "Oswald",
    family: '"Oswald", "Arial Narrow", sans-serif',
    weight: "700",
    googleUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap",
  },
  {
    id: "barlow",
    label: "Barlow",
    family: '"Barlow Condensed", "Arial Narrow", sans-serif',
    weight: "800",
    googleUrl: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&display=swap",
  },
  {
    id: "teko",
    label: "Teko",
    family: '"Teko", "Arial Narrow", sans-serif',
    weight: "700",
    googleUrl: "https://fonts.googleapis.com/css2?family=Teko:wght@700&display=swap",
  },
  {
    id: "black-ops",
    label: "Black Ops",
    family: '"Black Ops One", Impact, sans-serif',
    weight: "400",
    googleUrl: "https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap",
  },
  {
    id: "impact",
    label: "Impact",
    family: 'Impact, "Arial Narrow", Arial, sans-serif',
    weight: "400",
    googleUrl: undefined,
  },
];

export type JerseySubPattern =
  | "none"
  | "diagonal-gradient"
  | "vertical-fade"
  | "color-block"
  | "geometric-mesh";

export type JerseySubDirection =
  | "none"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface JerseyDesign {
  primaryColor: string;
  secondaryColor: string;
  /** Third / trim accent colour (collar, cuffs, side panel, sleeve trim).
   *  Falls back to secondaryColor when the kit only has two real colours. */
  accentColor?: string;
  shortsColor: string;
  shortsPattern: JerseyPattern;
  jerseyPattern: JerseyPattern;
  /** Overlay design effect on top of the base pattern — replicates the
   *  unique design feature of modern kits (Barcelona's diagonal gradient,
   *  PSG's shoulder block, etc). Defaults to "none". */
  subPattern?: JerseySubPattern;
  /** Direction for sub-patterns that need one (gradients, color blocks). */
  subPatternDirection?: JerseySubDirection;
  playerName: string;
  playerNumber: string;
  clubLogoUrl: string | null;
  fontId: string;
  textColor: string;
  /** Number of stripe/hoop pairs for stripes-vertical, stripes-horizontal, and hoops patterns.
   *  E.g. 3 → 3 primary + 3 secondary stripes (Barcelona-wide).
   *       8 → narrow pinstripes (Inter Milan style).
   *  Ignored for solid/diagonal/halves/sash/chevron. */
  stripeCount: number;
  /** Horizontal offset for the pattern only (-0.5 to 0.5). Logos/text stay fixed. */
  patternOffset?: number;
}

export interface KitPreset {
  id: string;
  name: string;
  design: JerseyDesign;
}

export const DEFAULT_JERSEY_DESIGN: JerseyDesign = {
  primaryColor: "#FFFFFF",
  secondaryColor: "#C0392B",
  shortsColor: "#FFFFFF",
  shortsPattern: "solid",
  jerseyPattern: "solid",
  playerName: "YOUR NAME",
  playerNumber: "10",
  clubLogoUrl: null,
  fontId: "bebas",
  textColor: "#000000",
  stripeCount: 5,
  patternOffset: 0,
};

export const KIT_PRESETS: KitPreset[] = [
  {
    id: "classic-white",
    name: "Classic White",
    design: {
      primaryColor: "#FFFFFF",
      secondaryColor: "#000000",
      shortsColor: "#FFFFFF",
      shortsPattern: "solid",
      jerseyPattern: "solid",
      playerName: "YOUR NAME",
      playerNumber: "10",
      clubLogoUrl: null,
      fontId: "bebas",
      textColor: "#FFFFFF",
      stripeCount: 5,
    },
  },
  {
    id: "barcelona",
    name: "Barcelona",
    design: {
      primaryColor: "#A50044",
      secondaryColor: "#004D98",
      shortsColor: "#004D98",
      shortsPattern: "solid",
      jerseyPattern: "stripes-vertical",
      playerName: "YOUR NAME",
      playerNumber: "10",
      clubLogoUrl: null,
      fontId: "bebas",
      textColor: "#FFFFFF",
      stripeCount: 5, // Barcelona has ~5 wide stripe pairs
    },
  },
  {
    id: "netherlands",
    name: "Netherlands",
    design: {
      primaryColor: "#FF6600",
      secondaryColor: "#FFFFFF",
      shortsColor: "#FF6600",
      shortsPattern: "solid",
      jerseyPattern: "solid",
      playerName: "YOUR NAME",
      playerNumber: "10",
      clubLogoUrl: null,
      fontId: "bebas",
      textColor: "#FFFFFF",
      stripeCount: 5,
    },
  },
  {
    id: "juventus",
    name: "Juventus",
    design: {
      primaryColor: "#000000",
      secondaryColor: "#FFFFFF",
      shortsColor: "#000000",
      shortsPattern: "solid",
      jerseyPattern: "halves",
      playerName: "YOUR NAME",
      playerNumber: "10",
      clubLogoUrl: null,
      fontId: "bebas",
      textColor: "#FFFFFF",
      stripeCount: 5,
    },
  },
  {
    id: "brazil",
    name: "Brazil",
    design: {
      primaryColor: "#FEDD00",
      secondaryColor: "#009C3B",
      shortsColor: "#002776",
      shortsPattern: "solid",
      jerseyPattern: "solid",
      playerName: "YOUR NAME",
      playerNumber: "10",
      clubLogoUrl: null,
      fontId: "bebas",
      textColor: "#FFFFFF",
      stripeCount: 5,
    },
  },
  {
    id: "argentina",
    name: "Argentina",
    design: {
      primaryColor: "#74ACDF",
      secondaryColor: "#FFFFFF",
      shortsColor: "#74ACDF",
      shortsPattern: "solid",
      jerseyPattern: "stripes-vertical",
      playerName: "YOUR NAME",
      playerNumber: "10",
      clubLogoUrl: null,
      fontId: "bebas",
      textColor: "#FFFFFF",
      stripeCount: 3, // Argentina has 3 wide vertical stripes
    },
  },
];

export const JERSEY_PATTERNS: { id: JerseyPattern; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "stripes-vertical", label: "Stripes" },
  { id: "stripes-horizontal", label: "H. Stripes" },
  { id: "hoops", label: "Hoops" },
  { id: "diagonal", label: "Diagonal" },
  { id: "halves", label: "Halves" },
  { id: "sash", label: "Sash" },
  { id: "chevron", label: "Chevron" },
];

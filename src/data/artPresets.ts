export type ArtCategory = "van-gogh" | "impressionism" | "renaissance" | "modern";

/**
 * Bottle IDs from bottleTypes.json:
 *   "1" = IZY Bottle
 *   "2" = IZY Travel Bottle
 *   "3" = IZY Mug
 *   "4" = IZY Tumbler
 *
 * Place artwork files in /public/art/.
 * Use textureUrlByBottle to supply a version cropped/sized for a specific bottle shape.
 * Falls back to textureUrl when no bottle-specific version exists.
 */
export interface ArtPreset {
  id: string;
  name: string;
  artist: string;
  year: string;
  category: ArtCategory;
  /** Displayed in the grid — can be a low-res preview */
  imageUrl: string;
  /** Default texture applied to the bottle */
  textureUrl: string;
  /** Optional per-bottle overrides, keyed by bottle ID */
  textureUrlByBottle?: Record<string, string>;
}

export const artPresets: ArtPreset[] = [
  // ── Van Gogh ────────────────────────────────────────────────
  {
    id: "starry-night",
    name: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    category: "van-gogh",
    imageUrl: "/art/starry-night.jpg",
    textureUrl: "/art/starry-night.jpg",
    textureUrlByBottle: {
      "1": "/art/starry-night-bottle.jpg",
    },
  },
  {
    id: "sunflowers",
    name: "Sunflowers",
    artist: "Vincent van Gogh",
    year: "1888",
    category: "van-gogh",
    imageUrl: "/art/sunflowers.jpg",
    textureUrl: "/art/sunflowers.jpg",
  },
  {
    id: "almond-blossom",
    name: "Almond Blossom",
    artist: "Vincent van Gogh",
    year: "1890",
    category: "van-gogh",
    imageUrl: "/art/almond-blossom.jpg",
    textureUrl: "/art/almond-blossom.jpg",
  },
  {
    id: "wheat-field-crows",
    name: "Wheat Field with Crows",
    artist: "Vincent van Gogh",
    year: "1890",
    category: "van-gogh",
    imageUrl: "/art/wheat-field-crows.jpg",
    textureUrl: "/art/wheat-field-crows.jpg",
  },

  // ── Impressionism ───────────────────────────────────────────
  {
    id: "water-lilies",
    name: "Water Lilies",
    artist: "Claude Monet",
    year: "1906",
    category: "impressionism",
    imageUrl: "/art/water-lilies.jpg",
    textureUrl: "/art/water-lilies.jpg",
  },
  {
    id: "impression-sunrise",
    name: "Impression, Sunrise",
    artist: "Claude Monet",
    year: "1872",
    category: "impressionism",
    imageUrl: "/art/impression-sunrise.jpg",
    textureUrl: "/art/impression-sunrise.jpg",
  },
  {
    id: "grande-jatte",
    name: "A Sunday on La Grande Jatte",
    artist: "Georges Seurat",
    year: "1886",
    category: "impressionism",
    imageUrl: "/art/grande-jatte.jpg",
    textureUrl: "/art/grande-jatte.jpg",
  },
  {
    id: "great-wave",
    name: "The Great Wave",
    artist: "Katsushika Hokusai",
    year: "c. 1831",
    category: "impressionism",
    imageUrl: "/art/great-wave.jpg",
    textureUrl: "/art/great-wave.jpg",
  },

  // ── Renaissance ─────────────────────────────────────────────
  {
    id: "mona-lisa",
    name: "Mona Lisa",
    artist: "Leonardo da Vinci",
    year: "c. 1503–1519",
    category: "renaissance",
    imageUrl: "/art/mona-lisa.jpg",
    textureUrl: "/art/mona-lisa.jpg",
  },
  {
    id: "birth-of-venus",
    name: "The Birth of Venus",
    artist: "Sandro Botticelli",
    year: "c. 1484–1486",
    category: "renaissance",
    imageUrl: "/art/birth-of-venus.jpg",
    textureUrl: "/art/birth-of-venus.jpg",
  },
  {
    id: "girl-pearl-earring",
    name: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "c. 1665",
    category: "renaissance",
    imageUrl: "/art/girl-pearl-earring.jpg",
    textureUrl: "/art/girl-pearl-earring.jpg",
  },
  {
    id: "night-watch",
    name: "The Night Watch",
    artist: "Rembrandt van Rijn",
    year: "1642",
    category: "renaissance",
    imageUrl: "/art/night-watch.jpg",
    textureUrl: "/art/night-watch.jpg",
  },

  // ── Modern ──────────────────────────────────────────────────
  {
    id: "the-scream",
    name: "The Scream",
    artist: "Edvard Munch",
    year: "1893",
    category: "modern",
    imageUrl: "/art/the-scream.jpg",
    textureUrl: "/art/the-scream.jpg",
  },
  {
    id: "the-kiss",
    name: "The Kiss",
    artist: "Gustav Klimt",
    year: "1907–1908",
    category: "modern",
    imageUrl: "/art/the-kiss.jpg",
    textureUrl: "/art/the-kiss.jpg",
  },
  {
    id: "milkmaid",
    name: "The Milkmaid",
    artist: "Johannes Vermeer",
    year: "c. 1657–1658",
    category: "modern",
    imageUrl: "/art/milkmaid.jpg",
    textureUrl: "/art/milkmaid.jpg",
  },
  {
    id: "self-portrait-rembrandt",
    name: "Self-Portrait",
    artist: "Rembrandt van Rijn",
    year: "1659",
    category: "modern",
    imageUrl: "/art/self-portrait-rembrandt.jpg",
    textureUrl: "/art/self-portrait-rembrandt.jpg",
  },
];

export const ART_CATEGORIES: { id: ArtCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "van-gogh", label: "Van Gogh" },
  { id: "impressionism", label: "Impressionism" },
  { id: "renaissance", label: "Renaissance" },
  { id: "modern", label: "Modern" },
];

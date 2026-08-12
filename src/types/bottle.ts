export interface BottleType {
  id: number;
  name: string;
  capacity: string;
  description: string;
  model: string;
  image: string;
  components: string[];
  size: {
    width: number;
    height: number;
    unit: string;
  };
  price: number;
}

export interface LogoDecal {
  id: string;
  imageUrl: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
  direction: "horizontal" | "vertical";
  mode?: "color" | "engraving"; // Mode for rendering: color or stainless engraving
}

export interface TextEngraving {
  id: string;
  text: string;
  fontFamily: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
  color?: string; // Color for text (used in color mode)
  mode?: "color" | "engraving"; // Mode for rendering: color or stainless engraving
}

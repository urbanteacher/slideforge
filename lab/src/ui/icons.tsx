import {
  Aperture, Blend, ChartColumn, CircleHelp, Droplet, Droplets, Film, Flame, Flashlight, Grid2x2, Grid3x3, Grip, Image, ImagePlus,
  LayoutGrid, Palette, Table, Rainbow, Shapes, SlidersHorizontal, Sparkles, Square, Sun, Timer, Tornado, Type, Video, Waves, ZoomIn,
  type LucideIcon,
} from 'lucide-react';

export const KIND_ICON: Record<string, LucideIcon> = {
  text: Type, table: Table, image: Image, shape: Shapes, video: Video, chart: ChartColumn, quiz: CircleHelp, activity: Timer, timer: Timer, solid: Square, linear: Blend, mesh: Sparkles, aurora: Waves, grid: Grid3x3,
  ripple: Waves, wave: Droplets, swirl: Tornado, lens: ZoomIn, gradientMap: Palette, adjust: SlidersHorizontal,
  spotlight: Flashlight, glow: Sun, leak: Flame, grain: Film, halftone: Grip, pixelate: Grid2x2, chroma: Rainbow,
  vignette: Aperture, blur: Droplet,
};

export const CAT_ICON: Record<string, LucideIcon> = {
  source: ImagePlus, featured: LayoutGrid, generate: Sparkles, distort: Waves, colour: Droplet, light: Sun, stylise: Grip,
};

export function KindIcon({ kind, size = 14 }: { kind: string; size?: number }) {
  const I = KIND_ICON[kind] ?? Square;
  return <I size={size} strokeWidth={1.8} />;
}

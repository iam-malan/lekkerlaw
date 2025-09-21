import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const VibrantMod = require("node-vibrant/node");
const vFrom = (VibrantMod && VibrantMod.from) ? VibrantMod.from : (VibrantMod?.default?.from);
import fs from "node:fs";
import path from "node:path";

function findBrandImage(): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const candidates = files
    .filter((f) => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
    // prefer raster for better palette detection
    .sort((a, b) => {
      const score = (name: string) =>
        (/(png|jpg|jpeg|webp)$/i.test(name) ? 0 : 1) +
        (/(logo|lekkerlaw)/i.test(name) ? 0 : 1);
      return score(a) - score(b);
    });
  if (candidates.length === 0) return null;
  return path.join(dir, candidates[0]);
}

async function run() {
  const src = findBrandImage();
  if (!src) {
    console.error(
      "No logo found. Place any image (png/jpg/webp/svg) in public/brand, e.g., Lekkerlawlogo.png"
    );
    process.exit(1);
  }
  if (!vFrom) {
    console.error("node-vibrant import failed. Try reinstalling or ensure version supports 'node' build.");
    process.exit(1);
  }
  const palette = await vFrom(src).getPalette();
  const colors = {
    primary: palette.Vibrant?.hex || "#facc15",
    secondary: palette.Muted?.hex || "#262626",
    accent: palette.LightVibrant?.hex || "#fde047",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444"
  } as const;
  fs.writeFileSync("brand.json", JSON.stringify(colors, null, 2));
  console.log("Source:", src);
  console.log("Extracted brand colors:", colors);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

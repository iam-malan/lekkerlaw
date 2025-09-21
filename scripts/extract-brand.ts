import Vibrant from "node-vibrant";
import fs from "node:fs";

async function run() {
  const imgPng = "public/brand/lekkerlaw-logo.png";
  const imgSvg = "public/brand/lekkerlaw-logo.svg";
  const src = fs.existsSync(imgPng) ? imgPng : imgSvg;
  if (!fs.existsSync(src)) {
    console.error("Logo not found. Place it at public/brand/lekkerlaw-logo.png or .svg then re-run.");
    process.exit(1);
  }
  const palette = await Vibrant.from(src).getPalette();
  const colors = {
    primary: palette.Vibrant?.hex || "#facc15",
    secondary: palette.Muted?.hex || "#262626",
    accent: palette.LightVibrant?.hex || "#fde047",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444"
  } as const;
  fs.writeFileSync("brand.json", JSON.stringify(colors, null, 2));
  console.log("Extracted brand colors:", colors);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

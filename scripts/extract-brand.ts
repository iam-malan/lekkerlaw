import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

function findBrandImage(): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const candidates = files
    .filter((f) => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
    .sort((a, b) => {
      const score = (name: string) =>
        (/(png|jpg|jpeg|webp)$/i.test(name) ? 0 : 1) +
        (/(logo|lekkerlaw)/i.test(name) ? 0 : 1);
      return score(a) - score(b);
    });
  if (candidates.length === 0) return null;
  return path.join(dir, candidates[0]);
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hex(c: number) {
  const h = c.toString(16).padStart(2, "0");
  return h;
}

function toHex(r: number, g: number, b: number) {
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

async function extractPalette(src: string) {
  // Resize and get raw pixels
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .resize(200, 200, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Quantize to 4 bits per channel and build histogram
  const map = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue; // skip transparent
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // skip near white/black
    if ((r + g + b) / 3 < 15) continue;
    if ((r + g + b) / 3 > 245) continue;
    const rq = (r >> 4) & 0xf;
    const gq = (g >> 4) & 0xf;
    const bq = (b >> 4) & 0xf;
    const key = `${rq},${gq},${bq}`;
    map.set(key, (map.get(key) || 0) + 1);
  }

  const bins = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k.split(",").map((v) => (parseInt(v, 10) << 4) + 8));

  // Rank by saturation and brightness for primary first
  const scored = bins.map(([r, g, b]) => {
    const { s, l } = rgbToHsl(r, g, b);
    return { r, g, b, score: s * 0.7 + l * 0.3 };
  }).sort((a, b) => b.score - a.score);

  const primary = scored[0] || { r: 250, g: 204, b: 21 };

  // Secondary: pick darkest neutral among top bins
  const secondary = bins
    .map(([r, g, b]) => ({ r, g, b, ...rgbToHsl(r, g, b) }))
    .sort((a, b) => a.l - b.l)[0] || { r: 38, g: 38, b: 38 };

  // Accent: next most saturated far from primary
  const accent = scored.find((c) => Math.abs(c.score - primary.score) > 0.05) || scored[1] || primary;

  return {
    primary: toHex(primary.r, primary.g, primary.b),
    secondary: toHex(secondary.r, secondary.g, secondary.b),
    accent: toHex(accent.r, accent.g, accent.b),
  };
}

async function run() {
  const src = findBrandImage();
  if (!src) {
    console.error("No logo found in public/brand");
    process.exit(1);
  }
  const base = await extractPalette(src);
  const colors = {
    primary: base.primary,
    secondary: base.secondary,
    accent: base.accent,
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

import fs from "node:fs";
import path from "node:path";

export type BrandPalette = {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
};

const fallback: BrandPalette = {
  primary: "#facc15",
  secondary: "#262626",
  accent: "#fde047",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

export function loadBrand(): BrandPalette {
  try {
    const p = path.join(process.cwd(), "brand.json");
    if (!fs.existsSync(p)) return fallback;
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    return { ...fallback, ...data } as BrandPalette;
  } catch {
    return fallback;
  }
}

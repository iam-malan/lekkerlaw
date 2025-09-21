import { loadBrand } from "@/lib/brand";

export default function BrandStyle() {
  const c = loadBrand();
  const css = `:root{--primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

#!/usr/bin/env node
/**
 * Generates placeholder PWA icons (192/512, regular + maskable) using sharp.
 * Run: node scripts/generate-pwa-icons.js
 *
 * Replace the SVG below with the real brand logo once available.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
const BRAND = "#6366f1";
const BRAND_DARK = "#4338ca";
const WHITE = "#ffffff";

fs.mkdirSync(OUT_DIR, { recursive: true });

// Regular icons: tight art, sits inside a rounded square background
function regularSvg(size) {
  const inset = Math.round(size * 0.18);
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.46);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="700" font-size="${fontSize}" fill="${WHITE}"
        letter-spacing="-0.04em">PR</text>
  <rect x="${inset}" y="${size - inset - Math.round(size * 0.04)}" width="${size - inset * 2}" height="${Math.round(size * 0.04)}" rx="${Math.round(size * 0.02)}" fill="${WHITE}" fill-opacity="0.35"/>
</svg>`;
}

// Maskable icons: full-bleed background, safe zone in the center 80%
function maskableSvg(size) {
  const fontSize = Math.round(size * 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#g)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="700" font-size="${fontSize}" fill="${WHITE}"
        letter-spacing="-0.04em">PR</text>
</svg>`;
}

async function writePng(filename, svg) {
  const outPath = path.join(OUT_DIR, filename);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
  console.log("wrote", path.relative(process.cwd(), outPath));
}

async function main() {
  await writePng("icon-192.png", regularSvg(192));
  await writePng("icon-512.png", regularSvg(512));
  await writePng("icon-maskable-192.png", maskableSvg(192));
  await writePng("icon-maskable-512.png", maskableSvg(512));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// ── QR generator ───────────────────────────────────────────────────────────
//
//   npm run qr -- listen write
//
// Underscore-prefixed because everything under `api/` that isn't `_`-prefixed
// becomes a deployed endpoint, and this is an offline tool, not a route.
//
// Writes one plain SVG per slug to `output/`, named after the slug, encoding
// `<origin>/go/<slug>`. Nothing but the code itself — no logo, no colour beyond
// navy on white, no decoration — because the artwork happens elsewhere and this
// just needs to hand over something correct to drop into it.
//
// Options:
//   --size=40      finished width in mm (default 40)
//   --origin=…     default https://slopbop.com
//   --level=H      error correction: L, M, Q or H (default H)
//
// Three things here are load-bearing for a code that has to work on a wall:
//
//   1. **Dark on light, never inverted.** Plenty of scanners refuse a light-on-
//      dark QR outright. Navy modules on white — which is also the highest
//      contrast pairing in the palette.
//   2. **The quiet zone is baked in.** The white border around the code is part
//      of the spec, not padding: without ~4 modules of clear space, scanners
//      lose the edges. It's included in the SVG so it can't be cropped off or
//      designed over by accident.
//   3. **Level H by default** — ~30% of the code can be damaged and still read,
//      which is what outdoors, rain and scuffing cost you.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

// Only so the run can tell you where each slug currently points. The generator
// stays generic — it will happily encode a slug that isn't registered yet — but
// printing the destination makes the indirection visible at the moment you're
// about to send artwork to a printer, which is the moment to notice it's wrong.
import { STICKERS } from './_slugs.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'output');

const NAVY = '#051648';
const WHITE = '#FFFFFF';
const QUIET_ZONE_MODULES = 4;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const slugs = args.filter(a => !a.startsWith('--'));
const size = Number(flag('size', 40));
const origin = flag('origin', 'https://slopbop.com').replace(/\/+$/, '');
const level = flag('level', 'H').toUpperCase();

if (slugs.length === 0) {
  console.error('Usage: npm run qr -- <slug> [slug…] [--size=40] [--origin=…] [--level=H]');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

for (const slug of slugs) {
  const url = `${origin}/go/${slug}`;

  const markup = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: url,
      level,
      size: 100,
      marginSize: QUIET_ZONE_MODULES,
      bgColor: WHITE,
      fgColor: NAVY,
    }),
  );

  // qrcode.react sizes in pixels; re-home it into millimetres so the file drops
  // into a print document at its real finished size. The viewBox is in modules,
  // so it stays vector and scales without a resample either way.
  const modules = markup.match(/viewBox="0 0 (\d+)/)[1];
  const body = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="0 0 ${modules} ${modules}">
  <title>${url}</title>
  <desc>QR to ${url}. Error correction ${level}. The white border is the required ${QUIET_ZONE_MODULES}-module quiet zone — keep it clear, don't crop or draw into it.</desc>
  ${body}
</svg>
`;

  writeFileSync(resolve(OUT, `${slug}.svg`), svg);

  console.log(`\noutput/${slug}.svg  (${size}mm, level ${level})`);
  console.log(`  scans   ${url}`);

  const registered = STICKERS[slug];
  if (registered) {
    console.log(`  lands   ${registered.fallback}`);
    console.log(`          ↑ the fallback in _slugs.ts. Whatever /sticker-admin`);
    console.log(`            has stored for this slug wins over it at scan time.`);
  } else {
    console.log(`  lands   nowhere — "${slug}" isn't in _slugs.ts, so a scan will`);
    console.log(`          bounce to the homepage. Add it there before printing.`);
  }
}

console.log();

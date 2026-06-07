// Dev-only: overlay each field's NAME on the blanked template so adapters can be authored
// by sight. Usage: node scripts/_overlay.mjs <providerId>
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'node:fs';

const id = process.argv[2] || 'bulgaria-insurance';
const dir = `public/templates/property/${id}`;
const { fields } = JSON.parse(readFileSync(`${dir}/fields.json`, 'utf8'));
const doc = await PDFDocument.load(readFileSync(`${dir}/template.pdf`), { ignoreEncryption: true });
const font = await doc.embedFont(StandardFonts.Helvetica);
const pages = doc.getPages();

// Transliterate Cyrillic -> Latin so StandardFonts (WinAnsi) can render the label.
const MAP = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' };
const tr = (s) => s.split('').map((ch) => { const l = MAP[ch.toLowerCase()]; if (!l) return /[ -~]/.test(ch) ? ch : ''; return ch === ch.toUpperCase() ? l.toUpperCase() : l; }).join('');

let i = 0;
for (const f of fields) {
  const [x0, y0, x1, y1] = f.rect;
  const p = pages[f.page];
  const isBtn = f.type === '/Btn';
  p.drawRectangle({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, borderColor: isBtn ? rgb(0.85,0.1,0.1) : rgb(0.1,0.3,0.9), borderWidth: 0.5, opacity: 0 });
  const label = tr(f.name).slice(0, 22);
  p.drawText(label, { x: x0, y: y1 + 0.5, size: 3.6, font, color: isBtn ? rgb(0.8,0,0) : rgb(0,0.2,0.85) });
  i++;
}
writeFileSync(`/tmp/overlay-${id}.pdf`, await doc.save());
console.log(`overlaid ${i} fields -> /tmp/overlay-${id}.pdf`);

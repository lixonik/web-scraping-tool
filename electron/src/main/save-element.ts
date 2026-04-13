import { Locator } from 'playwright-core';
import { mkdir, writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createPdf, setFonts } from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatDateLocal, formatDateISO } from './date-utils';

const OUTPUT_DIR = join(__dirname, '../../../output/saved_elements');

export function evaluateJsRepresentation(locator: Locator): Promise<Record<string, unknown>> {
  return locator.evaluate((el) => {
    const result: Record<string, unknown> = {};
    const skipKeys = new Set([
      'parentNode', 'parentElement', 'ownerDocument',
      'previousSibling', 'nextSibling', 'previousElementSibling', 'nextElementSibling',
      'firstChild', 'lastChild', 'firstElementChild', 'lastElementChild',
      'childNodes', 'children',
      'shadowRoot', 'assignedSlot',
    ]);

    for (const key in el) {
      if (skipKeys.has(key)) continue;
      try {
        const val = (el as any)[key];
        if (typeof val === 'function') continue;
        if (val instanceof Node || val instanceof NodeList || val instanceof HTMLCollection) continue;
        if (val instanceof Window) continue;

        if (val === null || val === undefined || typeof val !== 'object') {
          result[key] = val;
        } else if (Array.isArray(val)) {
          result[key] = val.map((item) =>
            item === null || item === undefined || typeof item !== 'object' ? item : '[object]'
          );
        } else if (val instanceof DOMTokenList) {
          result[key] = Array.from(val);
        } else if (val instanceof NamedNodeMap) {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < val.length; i++) {
            attrs[val[i].name] = val[i].value;
          }
          result[key] = attrs;
        } else if (val instanceof DOMStringMap) {
          result[key] = { ...val };
        } else if (val instanceof CSSStyleDeclaration) {
          const styles: Record<string, string> = {};
          for (let i = 0; i < val.length; i++) {
            styles[val[i]] = val.getPropertyValue(val[i]);
          }
          result[key] = styles;
        } else if (val instanceof DOMRect || val instanceof DOMRectReadOnly) {
          result[key] = { x: val.x, y: val.y, width: val.width, height: val.height, top: val.top, right: val.right, bottom: val.bottom, left: val.left };
        } else {
          const shallow: Record<string, unknown> = {};
          for (const k in val) {
            try {
              const v = val[k];
              if (typeof v !== 'function' && typeof v !== 'object') {
                shallow[k] = v;
              } else if (v === null) {
                shallow[k] = null;
              } else {
                shallow[k] = '[object]';
              }
            } catch { /* skip */ }
          }
          result[key] = shallow;
        }
      } catch { /* skip inaccessible props */ }
    }
    return result;
  });
}

// --- PDF ---

let fontsInitialized = false;

function initPdfFonts() {
  const fontDir = join(__dirname, '../../node_modules/pdfmake/build/fonts/Roboto');

  const { virtualfs } = require('pdfmake') as { virtualfs: { writeFileSync(name: string, data: Buffer): void } };
  virtualfs.writeFileSync('Roboto-Regular.ttf', readFileSync(join(fontDir, 'Roboto-Regular.ttf')));
  virtualfs.writeFileSync('Roboto-Medium.ttf', readFileSync(join(fontDir, 'Roboto-Medium.ttf')));
  virtualfs.writeFileSync('Roboto-Italic.ttf', readFileSync(join(fontDir, 'Roboto-Italic.ttf')));

  setFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
    },
  });
}

async function generatePdfReport(
  dir: string,
  locatorStr: string,
  dateStr: string,
  html: string,
  jsRepr: Record<string, unknown>,
  screenshotBuffer: Buffer,
): Promise<void> {
  if (!fontsInitialized) {
    initPdfFonts();
    fontsInitialized = true;
  }

  const jsonStr = JSON.stringify(jsRepr, null, 2);
  const screenshotDataUrl = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: 'Element Report', style: 'header' },
      { text: `Locator: ${locatorStr}`, style: 'subheader' },
      { text: `Date: ${dateStr}`, margin: [0, 0, 0, 16] },

      { text: 'Screenshot', style: 'sectionTitle' },
      { image: screenshotDataUrl, fit: [500, 400], margin: [0, 0, 0, 16] },

      { text: 'HTML', style: 'sectionTitle' },
      { text: html, style: 'code' },

      { text: 'JS Properties', style: 'sectionTitle' },
      { text: jsonStr, style: 'code' },
    ],
    styles: {
      header: { fontSize: 20, bold: true, margin: [0, 0, 0, 8] },
      subheader: { fontSize: 12, color: '#555', margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      code: { fontSize: 8, preserveLeadingSpaces: true, background: '#f5f5f5', margin: [0, 0, 0, 12] },
    },
    defaultStyle: { font: 'Roboto' },
  };

  const pdfPath = join(dir, 'report.pdf');
  const pdf = createPdf(docDefinition);
  await pdf.write(pdfPath);
}

// --- Main export ---

export async function saveLocatorData(locator: Locator, locatorStr: string): Promise<string> {
  const now = new Date();
  const safeName = locatorStr.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const dir = join(OUTPUT_DIR, `${formatDateLocal(now)}_${safeName}`);
  await mkdir(dir, { recursive: true });

  // 1) HTML
  const html = await locator.evaluate((el) => el.outerHTML);
  await writeFile(join(dir, 'element.html'), html, 'utf-8');

  // 2) JS representation
  const jsRepr = await evaluateJsRepresentation(locator);
  await writeFile(join(dir, 'element.json'), JSON.stringify(jsRepr, null, 2), 'utf-8');

  // 3) Screenshot
  const screenshotBuffer = await locator.screenshot({ path: join(dir, 'element.jpeg'), type: 'jpeg' });

  // 4) PDF report
  await generatePdfReport(dir, locatorStr, formatDateISO(now), html, jsRepr, screenshotBuffer);

  return dir;
}

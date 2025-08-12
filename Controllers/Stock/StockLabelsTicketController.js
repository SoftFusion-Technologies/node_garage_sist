// controllers/StockLabelsTicketController.js
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import { Op } from 'sequelize';

import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';
import { TallesModel } from '../../Models/Stock/MD_TB_Talles.js';
import { LocalesModel } from '../../Models/Stock/MD_TB_Locales.js';
import { LugaresModel } from '../../Models/Stock/MD_TB_Lugares.js';
import { EstadosModel } from '../../Models/Stock/MD_TB_Estados.js';
import { encodeNumericSku } from '../../Utils/skuNumeric.js';

/* --------------------------------- Medidas --------------------------------- */
const cmToPt = (cm) => cm * 28.3464567; // 1 cm = 28.3464567 pt
const mmToPt = (mm) => (mm / 10) * 28.3464567;
const ptToPx = (pt, dpi) => Math.round((pt / 72) * dpi);
const ptToMm = (pt) => (pt / 72) * 25.4;

/* ------------------- Barcode Code128 con ancho forzado --------------------- */
// Genera PNG del Code128 forzando el ancho del símbolo (en px) al ancho útil.
const barcodePngFit = (text, { widthPt, dpi = 203, heightMm = 8 } = {}) =>
  new Promise((resolve, reject) => {
    const widthPx = ptToPx(widthPt, dpi); // ancho objetivo en px
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text: String(text),
        includetext: false,
        width: widthPx, // clave para SKUs largos: ocupar todo el ancho
        height: Number(heightMm) // altura de barras en mm
        // si el lector pide más quiet zone: paddingwidth / paddingheight (px)
      },
      (err, png) => (err ? reject(err) : resolve(png))
    );
  });

/* ----------------------- Helpers para texto legible ------------------------ */
const middleEllipsis = (s, max) => {
  const str = String(s);
  if (str.length <= max) return str;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return str.slice(0, head) + '…' + str.slice(str.length - tail);
};

// Busca un tamaño de fuente que haga que el bloque de texto (wrapping) no supere maxHeightPt
const fitFontForBlock = (
  doc,
  text,
  widthPt,
  maxHeightPt,
  maxPt = 6,
  minPt = 3.5
) => {
  let lo = minPt,
    hi = maxPt,
    best = minPt;
  // binsearch simple
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    doc.fontSize(mid);
    const h = doc.heightOfString(String(text), {
      width: widthPt,
      align: 'center',
      lineGap: 0
    });
    if (h <= maxHeightPt) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.05) break;
  }
  return best;
};

// Dibuja el SKU según modo: 'end' | 'middle' | 'wrap' | 'shrink' | 'full'
const drawSkuText = (
  doc,
  sku,
  {
    x,
    y,
    widthPt,
    mode = 'middle',
    fontPt = 6,
    minPt = 4.5,
    lines = 1,
    maxHeightPt = null // requerido en 'full'
  }
) => {
  doc.font('Helvetica-Bold').fillColor('#000');
  const text = String(sku);

  if (mode === 'full') {
    // Ajuste automático de fuente con wrap para que entre COMPLETO en maxHeightPt
    const size = fitFontForBlock(
      doc,
      text,
      widthPt,
      maxHeightPt,
      fontPt,
      minPt
    );
    doc
      .fontSize(size)
      .text(text, x, y, { width: widthPt, align: 'center', lineGap: 0 });
    return size + 2; // alto aproximado de última línea, no se usa para reservar (ya se reservó afuera)
  }

  if (mode === 'wrap' && lines > 1) {
    doc
      .fontSize(fontPt)
      .text(text, x, y, { width: widthPt, align: 'center', lineGap: 0 });
    const lineH = fontPt + 1;
    return lines * lineH;
  }

  if (mode === 'shrink') {
    const size = fitFontForBlock(doc, text, widthPt, fontPt + 2, fontPt, minPt); // aprox una línea
    doc.fontSize(size).text(text, x, y, { width: widthPt, align: 'center' });
    return size + 2;
  }

  // end / middle con elipsis manual
  const maxChars = 22;
  const legible =
    mode === 'middle'
      ? middleEllipsis(text, maxChars)
      : text.length > maxChars
      ? text.slice(0, maxChars - 1) + '…'
      : text;
  doc.fontSize(fontPt).text(legible, x, y, { width: widthPt, align: 'center' });
  return fontPt + 2;
};

/* ------------------------------ DEMO: 30x15 mm ------------------------------ */
export const imprimirEtiquetaTicketDemo = async (req, res) => {
  try {
    const {
      sku = 'DEMO-12345',
      showText = '1', // '1' muestra texto humano
      ancho_cm = '3', // 3 cm
      alto_cm = '1.5', // 1.5 cm
      quiet_mm = '2', // quiet zone
      font_pt = '6', // tamaño base del texto
      height_mm, // si no viene, se calcula del espacio disponible
      min_barcode_mm = '6', // altura mínima del barcode (mm) para 'full'
      dpi: dpiQuery = '203', // 203 o 300
      text_mode = 'middle', // 'end' | 'middle' | 'wrap' | 'shrink' | 'full'
      text_lines, // para 'wrap' (default 2)
      min_font_pt = '3.5' // mínimo para 'full'/'shrink'
    } = req.query;

    const W = cmToPt(Number(ancho_cm));
    const H = cmToPt(Number(alto_cm));
    const Q = mmToPt(Number(quiet_mm));
    const dpi = Number(dpiQuery);
    const showSkuText = showText === '1' || showText === 'true';
    const fontPtNum = Number(font_pt);
    const textLines = Number(text_lines || (text_mode === 'wrap' ? 2 : 1));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="etiqueta_ticket_demo.pdf"'
    );

    const doc = new PDFDocument({ autoFirstPage: false });
    doc.pipe(res);
    doc.addPage({ size: [W, H], margin: 0 });

    // Área útil
    const x0 = Q,
      y0 = Q;
    const widthPt = Math.max(1, W - Q - Q);
    const heightPt = Math.max(1, H - Q - Q);

    // Distribución vertical
    let barcodeHpt, textMaxHpt;
    if (showSkuText && text_mode === 'full') {
      // barcode mínimo + todo el resto para texto
      barcodeHpt = mmToPt(Number(min_barcode_mm));
      barcodeHpt = Math.min(barcodeHpt, heightPt - 1); // no exceder
      textMaxHpt = Math.max(0, heightPt - barcodeHpt);
    } else {
      // reserva estática según modo
      const textH = showSkuText
        ? text_mode === 'wrap'
          ? textLines * (fontPtNum + 1)
          : fontPtNum + 2
        : 0;
      textMaxHpt = textH;
      barcodeHpt = Math.max(1, heightPt - textMaxHpt);
    }

    // Altura efectiva (mm) del barcode, si no vino por query
    const effHeightMm = height_mm
      ? Number(height_mm)
      : Math.max(4, Math.round(ptToMm(barcodeHpt)));

    // Generar barcode ajustado al ancho
    const png = await barcodePngFit(sku, {
      widthPt,
      dpi,
      heightMm: effHeightMm
    });

    // Dibujo barcode
    doc.image(png, x0, y0, { width: widthPt, height: barcodeHpt });

    const preserveCopyHyphen = (req.query.preserve_copy_hyphen ?? '1') !== '0';

    // Dibujo texto
    if (showSkuText) {
      const yText = y0 + barcodeHpt - 1;
      drawSkuText(doc, sku, {
        x: x0,
        y: yText,
        widthPt,
        mode: String(text_mode || 'middle'),
        fontPt: fontPtNum,
        minPt: Number(min_font_pt || 3.5),
        lines: textLines,
        maxHeightPt: textMaxHpt, // usado en 'full'
        preserveHyphen: preserveCopyHyphen
      });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ mensajeError: 'No se pudo generar la etiqueta demo (ticket).' });
  }
};

/* -------- REAL: N etiquetas 30x15 mm (1 por página) desde la DB ------------- */
// Misma semántica que imprimirEtiquetasReal: mode=group|item|all + copies=qty|1
export const imprimirEtiquetasTicket = async (req, res) => {
  const {
    mode = 'group',
    copies = 'qty',
    minQty = '1',

    // Layout/impresora
    ancho_cm = '3',
    alto_cm = '1.5',
    quiet_mm = '2',
    font_pt = '6',
    height_mm, // si no viene, se calcula del espacio
    showText = '1',
    dpi: dpiQuery = '203',
    text_mode = 'middle', // 'end' | 'middle' | 'wrap' | 'shrink' | 'full'
    text_lines,
    min_font_pt = '3.5',
    min_barcode_mm = '6', // mínimo de barras en 'full'
    barcode_src = 'numeric',
    text_gap_mm = '1.5',
    text_value = 'auto'
  } = req.query;

  try {
    /* ------------------------ 1) Filtro de búsqueda -------------------------- */
    const where = {};
    if (mode === 'group') {
      const { producto_id, local_id, lugar_id, estado_id } = req.query;
      Object.assign(where, {
        producto_id: Number(producto_id),
        local_id: Number(local_id),
        lugar_id: Number(lugar_id),
        estado_id: Number(estado_id),
        cantidad: { [Op.gte]: Number(minQty) }
      });
    } else if (mode === 'item') {
      const { stock_id } = req.query;
      Object.assign(where, {
        id: Number(stock_id),
        cantidad: { [Op.gte]: Number(minQty) }
      });
    } else if (mode === 'all') {
      Object.assign(where, { cantidad: { [Op.gte]: Number(minQty) } });
    } else {
      return res.status(400).json({ mensajeError: 'mode inválido' });
    }

    const include = [
      {
        model: ProductosModel,
        as: 'producto',
        attributes: ['id', 'nombre', 'precio']
      },
      { model: TallesModel, as: 'talle', attributes: ['nombre'] },
      { model: LocalesModel, as: 'locale', attributes: ['nombre'] },
      { model: LugaresModel, as: 'lugare', attributes: ['nombre'] },
      { model: EstadosModel, as: 'estado', attributes: ['nombre'] }
    ];

    const items = await StockModel.findAll({
      where,
      include,
      order: [
        ['talle_id', 'ASC'],
        ['id', 'ASC']
      ]
    });

    if (!items.length) {
      return res
        .status(404)
        .json({ mensajeError: 'No hay registros para imprimir.' });
    }

    /* --------------------------- 2) PDF etiqueta por página ------------------ */
    const W = cmToPt(Number(ancho_cm));
    const H = cmToPt(Number(alto_cm));
    const Q = mmToPt(Number(quiet_mm));
    const dpi = Number(dpiQuery);
    const showSkuText = showText === '1' || showText === 'true';
    const fontPtNum = Number(font_pt);
    const textLines = Number(text_lines || (text_mode === 'wrap' ? 2 : 1));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="etiquetas_ticket.pdf"'
    );

    const doc = new PDFDocument({ autoFirstPage: false });
    doc.pipe(res);

    // Cache PNGs por (sku + width + dpi + heightMm)
    const barcodeCache = new Map();

    const getBarcode = async (value, widthPt, effHeightMm) => {
      const key = `${value}|${Math.round(widthPt)}|${dpi}|${effHeightMm}`;
      if (!barcodeCache.has(key)) {
        const png = await barcodePngFit(String(value), {
          widthPt,
          dpi,
          heightMm: effHeightMm
        });
        barcodeCache.set(key, png);
      }
      return barcodeCache.get(key);
    };

    /* eslint-disable no-await-in-loop */
    for (const it of items) {
      const visibleSku = it.codigo_sku; // slug actual (texto humano)
      const numericSku = encodeNumericSku({
        producto_id: it.producto_id,
        talle_id: it.talle_id,
        local_id: it.local_id,
        lugar_id: it.lugar_id,
        estado_id: it.estado_id ?? 0
      });

      const copias =
        copies === 'qty' ? Math.max(1, Number(it.cantidad || 0)) : 1;

      for (let i = 0; i < copias; i++) {
        doc.addPage({ size: [W, H], margin: 0 });

        const x0 = Q,
          y0 = Q;
        const widthPt = Math.max(1, W - Q - Q);
        const heightPt = Math.max(1, H - Q - Q);
        const gapPt = mmToPt(Number(text_gap_mm)); // ← separación entre barra y texto

        // Elegimos qué valor va en el BARCODE y qué texto humano mostramos
        const barcodeValue =
          barcode_src === 'numeric' ? numericSku : String(visibleSku);
        const humanText =
          text_value === 'none'
            ? ''
            : text_value === 'slug'
            ? visibleSku
            : text_value === 'numeric'
            ? numericSku
            : // auto:
            barcode_src === 'numeric'
            ? numericSku
            : visibleSku;

        // Cálculo de alturas
        let barcodeHpt, textMaxHpt;
        const showText = showSkuText && humanText; // solo si hay algo que mostrar

        if (showText && text_mode === 'full') {
          // mínimo de barras + el resto para texto, con gap
          barcodeHpt = mmToPt(Number(min_barcode_mm));
          barcodeHpt = Math.min(barcodeHpt, heightPt - 1);
          textMaxHpt = Math.max(0, heightPt - barcodeHpt - gapPt);
        } else {
          // reserva estática según modo, + gap si hay texto
          const fontPtNum = Number(font_pt);
          const textH = showText
            ? text_mode === 'wrap'
              ? Number(text_lines || 2) * (fontPtNum + 1)
              : fontPtNum + 2
            : 0;
          textMaxHpt = textH + (showText ? gapPt : 0);
          barcodeHpt = Math.max(1, heightPt - textMaxHpt);
        }

        const effHeightMm = height_mm
          ? Number(height_mm)
          : Math.max(4, Math.round(ptToMm(barcodeHpt)));

        const png = await getBarcode(barcodeValue, widthPt, effHeightMm);

        // 1) Dibujo barras
        doc.image(png, x0, y0, { width: widthPt, height: barcodeHpt });

        // 2) Dibujo texto humano con el gap
        if (showText) {
          const yText = y0 + barcodeHpt + gapPt; // ← SEPARACIÓN AQUÍ
          drawSkuText(doc, humanText, {
            x: x0,
            y: yText,
            widthPt,
            mode: String(text_mode || 'middle'),
            fontPt: Number(font_pt),
            minPt: Number(min_font_pt || 3.5),
            lines: Number(text_lines || (text_mode === 'wrap' ? 2 : 1)),
            maxHeightPt: text_mode === 'full' ? textMaxHpt : undefined
          });
        }
      }
    }
    /* eslint-enable no-await-in-loop */

    doc.end();
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ mensajeError: 'No se pudo generar el PDF (ticket).' });
  }
};

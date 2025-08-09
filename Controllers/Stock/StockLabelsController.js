// controllers/StockLabelsController.js

import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';

import { Op } from 'sequelize';
// import { StockModel, ProductosModel, TallesModel, LocalesModel, LugaresModel, EstadosModel } from '../models/index.js';
import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';
import { TallesModel } from '../../Models/Stock/MD_TB_Talles.js';
import { LocalesModel } from '../../Models/Stock/MD_TB_Locales.js';
import { LugaresModel } from '../../Models/Stock/MD_TB_Lugares.js';
import { EstadosModel } from '../../Models/Stock/MD_TB_Estados.js';

const barcodePng = (text) =>
  new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      { bcid: 'code128', text, scale: 3, height: 12, includetext: false },
      (err, png) => (err ? reject(err) : resolve(png))
    );
  });

export const imprimirEtiquetaDemo = async (req, res) => {
  try {
    // Por ahora un SKU de prueba (luego vendrá de la DB)
    const sku = req.query.sku || 'DEMO-SKU-123';
    const nombre = req.query.nombre || 'Producto de Prueba';
    const talle = req.query.talle || 'XL';
    const local = req.query.local || 'El Garage 2';
    const lugar = req.query.lugar || 'Depósito A';

    // Headers para streaming PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="etiqueta_demo.pdf"'
    );

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    // Caja de etiqueta simple (1 por página, luego hacemos grilla)
    const x = 60,
      y = 80,
      w = 400,
      h = 180;
    doc.rect(x, y, w, h).strokeOpacity(0.3).stroke();

    // Títulos
    doc
      .fontSize(14)
      .text(nombre.slice(0, 40), x + 12, y + 12, { width: w - 24 });
    doc
      .fontSize(10)
      .fillColor('#444')
      .text(`${talle} · ${local} · ${lugar}`, x + 12, y + 36, {
        width: w - 24
      });

    // Código de barras (Code128)
    const png = await barcodePng(sku);
    doc.image(png, x + 20, y + 58, { width: w - 40, fit: [w - 40, 80] });

    // SKU en texto legible
    doc
      .fontSize(9)
      .fillColor('#333')
      .text(sku, x + 12, y + h - 24, { width: w - 24, align: 'center' });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensajeError: 'No se pudo generar el PDF' });
  }
};

export const imprimirEtiquetasReal = async (req, res) => {
  const { mode = 'group', copies = 'qty', layout = 'a4' } = req.query;

  try {
    // 1) Build query
    const where = {};
    if (mode === 'group') {
      const {
        producto_id,
        local_id,
        lugar_id,
        estado_id,
        minQty = 1
      } = req.query;
      Object.assign(where, {
        producto_id: Number(producto_id),
        local_id: Number(local_id),
        lugar_id: Number(lugar_id),
        estado_id: Number(estado_id),
        cantidad: { [Op.gte]: Number(minQty) } // solo >0 por default
      });
    } else if (mode === 'item') {
      const { stock_id, minQty = 0 } = req.query;
      Object.assign(where, {
        id: Number(stock_id),
        cantidad: { [Op.gte]: Number(minQty) }
      });
    } else if (mode === 'all') {
      const { minQty = 1 } = req.query;
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

    // 2) PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="etiquetas.pdf"');

    const doc = new PDFDocument({
      size: layout === 'a4' ? 'A4' : 'A4',
      margin: 24
    });
    doc.pipe(res);

    // Grilla A4 simple (ajustable)
    const grid = {
      cols: 3,
      rows: 10,
      w: 180,
      h: 72,
      gapX: 8,
      gapY: 6,
      startX: 24,
      startY: 24
    };
    let col = 0,
      row = 0;

    const place = async (it) => {
      const x = grid.startX + col * (grid.w + grid.gapX);
      const y = grid.startY + row * (grid.h + grid.gapY);

      const sku = it.codigo_sku;
      const png = await barcodePng(sku);

      doc.rect(x, y, grid.w, grid.h).strokeOpacity(0.15).stroke();
      doc
        .fontSize(9)
        .fillColor('#000')
        .text((it.producto?.nombre || '').slice(0, 28), x + 6, y + 6, {
          width: grid.w - 12
        });
      doc
        .fontSize(8)
        .fillColor('#444')
        .text(
          `${it.talle?.nombre || ''} · ${it.locale?.nombre || ''} · ${
            it.lugare?.nombre || ''
          } · ${it.estado?.nombre || ''}`,
          x + 6,
          y + 20,
          { width: grid.w - 12 }
        );
      doc.image(png, x + 8, y + 30, {
        width: grid.w - 16,
        fit: [grid.w - 16, 40]
      });
      doc
        .fontSize(7)
        .fillColor('#333')
        .text(sku, x + 6, y + grid.h - 12, {
          width: grid.w - 12,
          align: 'center'
        });

      col++;
      if (col >= grid.cols) {
        col = 0;
        row++;
      }
      if (row >= grid.rows) {
        row = 0;
        doc.addPage();
      }
    };

    for (const it of items) {
      const n = copies === 'qty' ? Math.max(1, Number(it.cantidad || 0)) : 1;
      for (let i = 0; i < n; i++) {
        // eslint-disable-next-line no-await-in-loop
        await place(it);
      }
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensajeError: 'No se pudo generar el PDF.' });
  }
};

/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 / 06 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Stock.js) contiene controladores para manejar operaciones CRUD sobre la tabla de stock.
 *
 * Tema: Controladores - Stock
 * Capa: Backend
 */

// Importaciones de modelos
import MD_TB_Stock from '../../Models/Stock/MD_TB_Stock.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';
import { TallesModel } from '../../Models/Stock/MD_TB_Talles.js';
import { LocalesModel } from '../../Models/Stock/MD_TB_Locales.js';
import { LugaresModel } from '../../Models/Stock/MD_TB_Lugares.js';
import { EstadosModel } from '../../Models/Stock/MD_TB_Estados.js';
import { DetalleVentaModel } from '../../Models/Ventas/MD_TB_DetalleVenta.js';
import db from '../../DataBase/db.js'; // Esta es tu instancia Sequelize
import { Op } from 'sequelize';
import { Transaction } from 'sequelize';

const StockModel = MD_TB_Stock.StockModel;

// Función para limpiar nombres (similar al front)
export function slugify(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .replace(/['"]/g, '') // saca comillas
    .replace(/\((.*?)\)/g, '$1') // quita paréntesis (deja el contenido)
    .replace(/[^a-z0-9]+/g, '-') // cualquier cosa no alfanumérica -> '-'
    .replace(/^-+|-+$/g, ''); // recorta guiones al inicio/fin
}

export function buildSku({
  productoNombre,
  talleNombre,
  localNombre,
  lugarNombre,
  maxLen = 150
}) {
  const parts = [
    slugify(productoNombre),
    (talleNombre || '').toUpperCase(),
    slugify(localNombre),
    slugify(lugarNombre)
  ].filter(Boolean); // evita segmentos vacíos que generen '--'

  let sku = parts.join('-').replace(/-+/g, '-'); // por si acaso, colapsa dobles
  if (!sku) sku = 'sku'; // fallback mínimo
  return sku.slice(0, maxLen); // evita "Data too long for column 'codigo_sku'"
}

async function ensureUniqueSku(
  baseSku,
  localId,
  excludeId = null,
  transaction
) {
  let candidate = baseSku;
  let i = 1;
  while (true) {
    const exists = await StockModel.findOne({
      where: {
        codigo_sku: candidate,
        local_id: localId,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
      },
      transaction
    });
    if (!exists) return candidate;
    i += 1;
    const suffix = `-${i}`;
    candidate = `${baseSku.slice(0, 150 - suffix.length)}${suffix}`;
  }
}

// Obtener todos los registros de stock con sus relaciones
export const OBRS_Stock_CTS = async (req, res) => {
  try {
    const { locales, producto_id, minQty } = req.query;

    const where = {};
    if (producto_id) where.producto_id = Number(producto_id);
    if (minQty) where.cantidad = { [Op.gte]: Number(minQty) };

    if (locales) {
      const ids = String(locales)
        .split(',')
        .map((x) => Number(x))
        .filter(Boolean);
      if (ids.length) where.local_id = { [Op.in]: ids };
    }

    const stock = await StockModel.findAll({
      where,
      include: [
        { model: ProductosModel },
        { model: TallesModel },
        { model: LocalesModel },
        { model: LugaresModel },
        { model: EstadosModel }
      ],
      order: [
        ['updated_at', 'DESC'],
        ['id', 'DESC']
      ]
    });

    res.json(stock);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo registro de stock por ID
export const OBR_Stock_CTS = async (req, res) => {
  try {
    const registro = await StockModel.findByPk(req.params.id, {
      include: [
        { model: ProductosModel },
        { model: TallesModel },
        { model: LocalesModel },
        { model: LugaresModel },
        { model: EstadosModel }
      ]
    });
    if (!registro)
      return res.status(404).json({ mensajeError: 'Stock no encontrado' });

    res.json(registro);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear nuevo registro de stock
export const CR_Stock_CTS = async (req, res) => {
  const tx = await db.transaction();
  try {
    const {
      producto_id,
      talle_id,
      local_id,
      lugar_id,
      estado_id,
      cantidad = 0,
      en_perchero = true,
      codigo_sku
    } = req.body || {};

    if (!producto_id || !talle_id || !local_id || !lugar_id || !estado_id) {
      await tx.rollback();
      return res
        .status(400)
        .json({ mensajeError: 'Faltan campos obligatorios.' });
    }

    let sku = (codigo_sku || '').trim() || null;

    if (!sku) {
      const [prod, talle, local, lugar] = await Promise.all([
        ProductosModel.findByPk(producto_id, { transaction: tx }),
        TallesModel.findByPk(talle_id, { transaction: tx }),
        LocalesModel.findByPk(local_id, { transaction: tx }),
        LugaresModel.findByPk(lugar_id, { transaction: tx })
      ]);

      if (prod?.nombre && talle?.nombre && local?.nombre && lugar?.nombre) {
        const base = buildSku({
          productoNombre: prod.nombre,
          talleNombre: talle.nombre,
          localNombre: local.nombre,
          lugarNombre: lugar.nombre
        });
        sku = await ensureUniqueSku(base, local_id, null, tx);
      } else {
        // Fallback técnico
        sku = `${producto_id}-${talle_id}-${local_id}-${lugar_id}`.slice(
          0,
          150
        );
      }
    }

    const nuevo = await StockModel.create(
      {
        producto_id,
        talle_id,
        local_id,
        lugar_id,
        estado_id,
        cantidad: Number(cantidad) || 0,
        en_perchero: !!en_perchero,
        codigo_sku: sku
      },
      { transaction: tx }
    );

    await tx.commit();
    res.json({ message: 'Stock creado correctamente', stock: nuevo });
  } catch (error) {
    await tx.rollback();
    res.status(500).json({ mensajeError: error.message });
  }
};


// Eliminar registro de stock
export const ER_Stock_CTS = async (req, res) => {
  try {
    const stockId = req.params.id;

    // 1. Buscá si hay ventas asociadas a este stock
    const ventaAsociada = await DetalleVentaModel.findOne({
      where: { stock_id: stockId }
    });

    if (ventaAsociada) {
      // Si hay ventas, NO eliminar. Solo actualizar cantidad a 0.
      await StockModel.update({ cantidad: 0 }, { where: { id: stockId } });
      return res.status(200).json({
        message:
          'Este stock está vinculado a ventas. Se actualizó la cantidad a 0 en vez de eliminar.'
      });
    }

    // 2. Si NO hay ventas, eliminar normalmente
    const eliminado = await StockModel.destroy({
      where: { id: stockId }
    });

    if (!eliminado)
      return res.status(404).json({ mensajeError: 'Stock no encontrado' });

    res.json({ message: 'Stock eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
// Actualizar registro de stock y fusionar si existe la combinación
export const UR_Stock_CTS = async (req, res) => {
  const {
    producto_id,
    talle_id,
    local_id,
    lugar_id,
    estado_id,
    cantidad,
    en_perchero
  } = req.body;
  const id = req.params.id;

  try {
    // 1. Buscá si ya existe OTRO stock con la misma combinación (menos el actual)
    const existente = await StockModel.findOne({
      where: {
        producto_id,
        talle_id,
        local_id,
        lugar_id,
        estado_id,
        id: { [Op.ne]: id }
      }
    });

    if (existente) {
      // 2. Si existe, suma las cantidades y borra el registro actual (merge)
      const nuevoStock = await existente.update({
        cantidad: existente.cantidad + Number(cantidad),
        en_perchero: en_perchero ?? existente.en_perchero
      });
      await StockModel.destroy({ where: { id } });
      return res.json({
        message: 'Stock fusionado con el registro existente',
        actualizado: nuevoStock
      });
    }

    // 3. Si no hay duplicado, updatea normal
    const [updated] = await StockModel.update(
      {
        producto_id,
        talle_id,
        local_id,
        lugar_id,
        estado_id,
        cantidad,
        en_perchero
      },
      { where: { id } }
    );

    if (updated === 1) {
      const actualizado = await StockModel.findByPk(id);
      res.json({ message: 'Stock actualizado', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Stock no encontrado' });
    }
  } catch (error) {
    console.error('Error en UR_Stock_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};

export const ER_StockPorProducto = async (req, res) => {
  const tx = await db.transaction();
  try {
    const producto_id = Number(req.params.id || req.body?.producto_id);
    if (!producto_id) {
      await tx.rollback();
      return res.status(400).json({ mensajeError: 'producto_id requerido' });
    }

    const filas = await StockModel.findAll({
      where: { producto_id },
      transaction: tx,
      attributes: ['id', 'cantidad']
    });
    if (!filas.length) {
      await tx.commit();
      return res.json({ message: 'Sin stock para ese producto.' });
    }

    // Ver ventas asociadas
    const ids = filas.map((f) => f.id);
    const venta = await DetalleVentaModel.findOne({
      where: { stock_id: ids },
      transaction: tx
    });

    if (venta) {
      // Suave: seteá 0
      await StockModel.update(
        { cantidad: 0 },
        { where: { id: ids }, transaction: tx }
      );
      await tx.commit();
      return res.json({
        message: 'Había ventas vinculadas. Se dejó cantidad=0.'
      });
    } else {
      // Limpio: destruir
      await StockModel.destroy({ where: { id: ids }, transaction: tx });
      await tx.commit();
      return res.json({ message: 'Stock eliminado.' });
    }
  } catch (error) {
    await tx.rollback();
    res.status(500).json({ mensajeError: error.message });
  }
};


// DISTRIBUIR: acepta local_id (legacy) o locales[] (multi)
export const DISTRIBUIR_Stock_CTS = async (req, res) => {
  const {
    producto_id,
    local_id, // legacy: un solo local
    locales, // nuevo: array de locales
    lugar_id,
    estado_id,
    en_perchero,
    talles
  } = req.body;

  // --- Validación base
  const localIds =
    Array.isArray(locales) && locales.length
      ? [...new Set(locales.map(Number).filter(Boolean))]
      : local_id
      ? [Number(local_id)]
        : [];
  
  

  if (
    !producto_id ||
    !lugar_id ||
    !estado_id ||
    !Array.isArray(talles) ||
    talles.length === 0 ||
    localIds.length === 0
  ) {
    return res.status(400).json({
      mensajeError:
        'Faltan datos: producto_id, lugar_id, estado_id, locales/local_id y talles son obligatorios.'
    });
  }

  // Normalizar talles
  const tallesOrdenados = (talles || [])
    .map((t) => ({
      talle_id: Number(t?.talle_id),
      cantidad: Number(t?.cantidad)
    }))
    .filter((t) => t.talle_id && Number.isFinite(t.cantidad) && t.cantidad > 0) // 👈 SOLO > 0
    .sort((a, b) => a.talle_id - b.talle_id);

  if (!tallesOrdenados.length) {
    return res
      .status(400)
      .json({ mensajeError: 'No hay talles con cantidad > 0.' });
  }

  try {
    // Prefetch de nombres (una sola vez)
    const [producto, lugar, filasLocales, filasTalles] = await Promise.all([
      ProductosModel.findByPk(producto_id),
      LugaresModel.findByPk(lugar_id),
      LocalesModel.findAll({ where: { id: { [Op.in]: localIds } } }),
      TallesModel.findAll({
        where: { id: { [Op.in]: tallesOrdenados.map((x) => x.talle_id) } }
      })
    ]);

    // Validación de locales existentes
    const localesMap = new Map(filasLocales.map((l) => [l.id, l.nombre]));
    const missingLocales = localIds.filter((id) => !localesMap.has(id));
    if (missingLocales.length) {
      return res.status(400).json({
        mensajeError: `Locales inexistentes: ${missingLocales.join(', ')}`
      });
    }

    const tallesMap = new Map(filasTalles.map((t) => [t.id, t.nombre]));

    // Construcción de filas a upsert (para TODOS los locales seleccionados)
    const filas = [];
    for (const locId of localIds) {
      const localNombre = localesMap.get(locId) || null;

      for (const t of tallesOrdenados) {
        const nombreTalle = tallesMap.get(t.talle_id) || null;

        const codigo_sku =
          producto?.nombre && localNombre && lugar?.nombre && nombreTalle
            ? buildSku({
                productoNombre: producto.nombre,
                talleNombre: nombreTalle,
                localNombre,
                lugarNombre: lugar?.nombre
              })
            : `${producto_id}-${t.talle_id}-${locId}-${lugar_id}`;

        filas.push({
          producto_id,
          local_id: locId,
          lugar_id,
          estado_id,
          talle_id: t.talle_id,
          cantidad: t.cantidad,
          en_perchero: !!en_perchero,
          codigo_sku
        });
      }
    }

    const tx = await db.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      await StockModel.bulkCreate(filas, {
        updateOnDuplicate: [
          'cantidad',
          'en_perchero',
          'codigo_sku',
          'updated_at'
        ],
        transaction: tx
      });

      await tx.commit();
      return res.json({
        message: 'Stock distribuido correctamente.',
        localesProcesados: localIds.length,
        filasProcesadas: filas.length
      });
    } catch (error) {
      await tx.rollback();
      console.error('Error en DISTRIBUIR_Stock_CTS (bulkCreate):', error);
      return res.status(500).json({ mensajeError: error.message });
    }
  } catch (error) {
    console.error('Error en DISTRIBUIR_Stock_CTS:', error);
    return res.status(500).json({ mensajeError: error.message });
  }
};

export const TRANSFERIR_Stock_CTS = async (req, res) => {
  const { grupoOriginal, nuevoGrupo, talles } = req.body;

  // Validación mínima + evitar no-op
  const camposOK =
    grupoOriginal?.producto_id &&
    grupoOriginal?.local_id &&
    grupoOriginal?.lugar_id &&
    grupoOriginal?.estado_id &&
    nuevoGrupo?.producto_id &&
    nuevoGrupo?.local_id &&
    nuevoGrupo?.lugar_id &&
    nuevoGrupo?.estado_id &&
    Array.isArray(talles) &&
    talles.length > 0;

  if (!camposOK) {
    return res
      .status(400)
      .json({ mensajeError: 'Datos incompletos para transferir stock' });
  }
  const mismoGrupo =
    grupoOriginal.producto_id === nuevoGrupo.producto_id &&
    grupoOriginal.local_id === nuevoGrupo.local_id &&
    grupoOriginal.lugar_id === nuevoGrupo.lugar_id &&
    grupoOriginal.estado_id === nuevoGrupo.estado_id;

  if (mismoGrupo) {
    return res.status(400).json({
      mensajeError: 'El grupo destino no puede ser igual al grupo origen.'
    });
  }

  const tx = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  // Helper: asegurar unicidad de (codigo_sku, local_id)
  const ensureUniqueSku = async (baseSku, localId, excludeId = null) => {
    let candidate = baseSku;
    let i = 1;
    // intenta base, luego base-2, base-3, ...
    while (true) {
      const exists = await StockModel.findOne({
        where: {
          codigo_sku: candidate,
          local_id: localId,
          ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
        },
        transaction: tx
      });
      if (!exists) return candidate;
      i += 1;
      const suffix = `-${i}`;
      candidate = `${baseSku.slice(0, 150 - suffix.length)}${suffix}`;
    }
  };

  try {
    // Prefetch nombres destino
    const [prodNuevo, localNuevo, lugarNuevo] = await Promise.all([
      ProductosModel.findByPk(nuevoGrupo.producto_id, { transaction: tx }),
      LocalesModel.findByPk(nuevoGrupo.local_id, { transaction: tx }),
      LugaresModel.findByPk(nuevoGrupo.lugar_id, { transaction: tx })
    ]);

    for (const { talle_id, cantidad } of talles) {
      const qty = Number(cantidad);
      if (!talle_id || !Number.isFinite(qty) || qty <= 0) continue;

      // 1) Origen (lock para evitar carreras)
      const stockOrigen = await StockModel.findOne({
        where: {
          producto_id: grupoOriginal.producto_id,
          talle_id,
          local_id: grupoOriginal.local_id,
          lugar_id: grupoOriginal.lugar_id,
          estado_id: grupoOriginal.estado_id
        },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });

      if (!stockOrigen || stockOrigen.cantidad < qty) {
        throw new Error(
          `No hay suficiente stock en origen para talle ${talle_id}`
        );
      }

      // Ventas asociadas (mismo tx)
      const ventaAsociada = await DetalleVentaModel.findOne({
        where: { stock_id: stockOrigen.id },
        transaction: tx
      });
      if (ventaAsociada) {
        throw new Error(
          `No se puede transferir el talle ${talle_id} porque tiene ventas asociadas.`
        );
      }

      // Restar en origen
     const nuevaCantOrigen = stockOrigen.cantidad - qty;
     if (nuevaCantOrigen <= 0) {
       await stockOrigen.update({ cantidad: 0 }, { transaction: tx });
     } else {
       await stockOrigen.update(
         { cantidad: nuevaCantOrigen },
         { transaction: tx }
       );
     }

      // 2) Destino (lock para merge seguro)
      const stockDestino = await StockModel.findOne({
        where: {
          producto_id: nuevoGrupo.producto_id,
          talle_id,
          local_id: nuevoGrupo.local_id,
          lugar_id: nuevoGrupo.lugar_id,
          estado_id: nuevoGrupo.estado_id
        },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });

      if (stockDestino) {
        // Merge cantidades; si el sku está NULL, generarlo ahora
        let fields = {
          cantidad: stockDestino.cantidad + qty,
          en_perchero: nuevoGrupo.en_perchero
        };

        if (
          !stockDestino.codigo_sku &&
          prodNuevo?.nombre &&
          localNuevo?.nombre &&
          lugarNuevo?.nombre
        ) {
          // buscar nombre del talle
          let nombreTalle = null;
          try {
            const tRow = await TallesModel.findByPk(talle_id, {
              transaction: tx
            });
            nombreTalle = tRow?.nombre || null;
          } catch {}
          if (nombreTalle) {
            const baseSku = buildSku({
              productoNombre: prodNuevo.nombre,
              talleNombre: nombreTalle,
              localNombre: localNuevo.nombre,
              lugarNombre: lugarNuevo.nombre
            });
            fields.codigo_sku = await ensureUniqueSku(
              baseSku,
              nuevoGrupo.local_id,
              stockDestino.id
            );
          }
        }

        await stockDestino.update(fields, { transaction: tx });
      } else {
        // Crear destino con SKU "lindo" y único
        let nombreTalle = null;
        try {
          const tRow = await TallesModel.findByPk(talle_id, {
            transaction: tx
          });
          nombreTalle = tRow?.nombre || null;
        } catch {}

        let codigo_sku;
        if (
          prodNuevo?.nombre &&
          localNuevo?.nombre &&
          lugarNuevo?.nombre &&
          nombreTalle
        ) {
          const baseSku = buildSku({
            productoNombre: prodNuevo.nombre,
            talleNombre: nombreTalle,
            localNombre: localNuevo.nombre,
            lugarNombre: lugarNuevo.nombre
          });
          codigo_sku = await ensureUniqueSku(baseSku, nuevoGrupo.local_id);
        } else {
          codigo_sku = `${nuevoGrupo.producto_id}-${talle_id}-${nuevoGrupo.local_id}-${nuevoGrupo.lugar_id}`;
        }

        await StockModel.create(
          {
            producto_id: nuevoGrupo.producto_id,
            talle_id,
            local_id: nuevoGrupo.local_id,
            lugar_id: nuevoGrupo.lugar_id,
            estado_id: nuevoGrupo.estado_id,
            cantidad: qty,
            en_perchero: !!nuevoGrupo.en_perchero,
            codigo_sku
          },
          { transaction: tx }
        );
      }
    }

    await tx.commit();
    res.json({ message: 'Stock transferido correctamente' });
  } catch (error) {
    await tx.rollback();
    res.status(500).json({
      mensajeError:
        error.message ||
        'Error al transferir stock. Puede que existan ventas vinculadas.'
    });
  }
};

// Elimina TODO el stock del grupo
export const ER_StockPorGrupo = async (req, res) => {
  const { producto_id, local_id, lugar_id, estado_id } = req.body;
  if (!producto_id || !local_id || !lugar_id || !estado_id) {
    return res.status(400).json({ mensajeError: 'Datos incompletos' });
  }
  try {
    // 1. Buscar stocks del grupo
    const stocksGrupo = await StockModel.findAll({
      where: { producto_id, local_id, lugar_id, estado_id },
      attributes: ['id', 'cantidad']
    });
    if (!stocksGrupo.length) {
      return res
        .status(404)
        .json({ mensajeError: 'No existe ningún stock en ese grupo.' });
    }
    const stockIds = stocksGrupo.map((s) => s.id);

    // 2. Validar ventas asociadas en detalle_venta
    const ventaAsociada = await DetalleVentaModel.findOne({
      where: { stock_id: stockIds }
    });
    if (ventaAsociada) {
      return res.status(409).json({
        mensajeError:
          'No se puede eliminar este grupo de stock porque está vinculado a ventas.'
      });
    }

    // 3. Validar stock en positivo
    if (stocksGrupo.some((s) => s.cantidad > 0)) {
      return res.status(409).json({
        mensajeError:
          'No se puede eliminar: aún hay stock disponible en el grupo.'
      });
    }

    // 4. Eliminar
    await StockModel.destroy({
      where: { producto_id, local_id, lugar_id, estado_id }
    });

    return res.json({ message: 'Grupo de stock eliminado exitosamente.' });
  } catch (error) {
    let mensaje = 'Error interno. ';
    if (
      error?.name === 'SequelizeForeignKeyConstraintError' ||
      (error?.parent && error.parent.code === 'ER_ROW_IS_REFERENCED_2')
    ) {
      mensaje =
        'No se puede eliminar este grupo de stock porque tiene registros relacionados (ventas u otros movimientos).';
    }
    return res
      .status(500)
      .json({ mensajeError: mensaje + (error.message || '') });
  }
};

export const DUPLICAR_Producto_CTS = async (req, res) => {
  const sourceId = Number(req.params.id);
  let {
    nuevoNombre,
    duplicarStock = true,
    copiarCantidad = false,
    locales, // puede venir array o string "1,3,6"
    generarSku = true
  } = req.body || {};

  if (!sourceId || !nuevoNombre?.trim()) {
    return res
      .status(400)
      .json({ mensajeError: 'Falta sourceId o nuevoNombre válido.' });
  }

  // ← opcional: normalizar locales
  if (typeof locales === 'string') {
    locales = locales
      .split(',')
      .map((x) => Number(x))
      .filter(Boolean);
  } else if (Array.isArray(locales)) {
    locales = [...new Set(locales.map(Number).filter(Boolean))];
  }

  const t = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  const ensureUniqueSku = async (baseSku, localId, excludeId = null) => {
    let candidate = baseSku,
      i = 1;
    while (true) {
      const exists = await StockModel.findOne({
        where: {
          codigo_sku: candidate,
          local_id: localId,
          ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
        },
        transaction: t
      });
      if (!exists) return candidate;
      i += 1;
      const suffix = `-${i}`;
      candidate = `${baseSku.slice(0, 150 - suffix.length)}${suffix}`;
    }
  };

  try {
    const prod = await ProductosModel.findByPk(sourceId, { transaction: t });
    if (!prod) {
      await t.rollback();
      return res
        .status(404)
        .json({ mensajeError: 'Producto origen no encontrado.' });
    }

    const precioNum = prod.precio ? Number(prod.precio) : 0;
    const descNum = prod.descuento_porcentaje
      ? Number(prod.descuento_porcentaje)
      : 0;
    const precioConDesc =
      descNum > 0
        ? Number((precioNum - precioNum * (descNum / 100)).toFixed(2))
        : precioNum;

    const nuevoProducto = await ProductosModel.create(
      {
        nombre: nuevoNombre.trim(),
        descripcion: prod.descripcion,
        categoria_id: prod.categoria_id,
        precio: precioNum,
        descuento_porcentaje: descNum > 0 ? descNum : null,
        precio_con_descuento: precioConDesc,
        imagen_url: prod.imagen_url,
        estado: prod.estado
      },
      { transaction: t }
    );

    let filasStockCreadas = 0;

    if (duplicarStock) {
      const whereStock = { producto_id: sourceId };

      // ← opcional: validar y aplicar filtro de locales si viene
      if (Array.isArray(locales) && locales.length > 0) {
        // validar existencia de locales
        const filasLocales = await LocalesModel.findAll({
          where: { id: { [Op.in]: locales } },
          attributes: ['id'],
          transaction: t
        });
        const existentes = new Set(filasLocales.map((l) => l.id));
        const invalidos = locales.filter((id) => !existentes.has(id));
        if (invalidos.length === locales.length) {
          await t.rollback();
          return res.status(400).json({
            mensajeError: `Ninguno de los locales existe: ${invalidos.join(
              ', '
            )}`
          });
        }
        // usar solo los válidos
        const localesValidos = locales.filter((id) => existentes.has(id));
        whereStock.local_id = { [Op.in]: localesValidos };
      }

      const stockOrigen = await StockModel.findAll({
        where: whereStock,
        attributes: [
          'talle_id',
          'local_id',
          'lugar_id',
          'estado_id',
          'cantidad',
          'en_perchero'
        ],
        transaction: t
      });

      if (stockOrigen.length === 0) {
        await t.commit();
        return res.json({
          message:
            'Producto duplicado (sin stock copiado por filtro de locales).',
          nuevo_producto_id: nuevoProducto.id,
          duplicoStock: false,
          filasStockCreadas: 0
        });
      }

      // insertamos con codigo_sku NULL y después generamos
      const filas = stockOrigen.map((s) => ({
        producto_id: nuevoProducto.id,
        talle_id: s.talle_id,
        local_id: s.local_id,
        lugar_id: s.lugar_id,
        estado_id: s.estado_id,
        cantidad: copiarCantidad ? Number(s.cantidad || 0) : 0,
        en_perchero: !!s.en_perchero,
        codigo_sku: null
      }));

      await StockModel.bulkCreate(filas, {
        transaction: t,
        ignoreDuplicates: true
      });
      filasStockCreadas = filas.length;

      if (generarSku) {
        const nuevos = await StockModel.findAll({
          where: { producto_id: nuevoProducto.id },
          include: [
            { model: TallesModel, as: 'talle', attributes: ['nombre'] },
            { model: LocalesModel, as: 'locale', attributes: ['nombre'] },
            { model: LugaresModel, as: 'lugare', attributes: ['nombre'] }
          ],
          transaction: t
        });

        for (const s of nuevos) {
          const base = buildSku({
            productoNombre: nuevoProducto.nombre,
            talleNombre: s.talle?.nombre,
            localNombre: s.locale?.nombre,
            lugarNombre: s.lugare?.nombre
          });
          const unique = await ensureUniqueSku(base, s.local_id, s.id);
          if (s.codigo_sku !== unique) {
            await s.update({ codigo_sku: unique }, { transaction: t });
          }
        }
      }
    }

    await t.commit();
    return res.json({
      message: 'Producto duplicado correctamente',
      nuevo_producto_id: nuevoProducto.id,
      duplicoStock: !!duplicarStock,
      filasStockCreadas
    });
  } catch (err) {
    await t.rollback();
    console.error('❌ Error DUPLICAR_Producto_CTS:', err);
    return res.status(500).json({ mensajeError: err.message });
  }
};

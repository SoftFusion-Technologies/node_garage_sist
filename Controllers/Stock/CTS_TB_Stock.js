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

// Obtener todos los registros de stock con sus relaciones
export const OBRS_Stock_CTS = async (req, res) => {
  try {
    const stock = await StockModel.findAll({
      include: [
        { model: ProductosModel },
        { model: TallesModel },
        { model: LocalesModel },
        { model: LugaresModel },
        { model: EstadosModel }
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
  try {
    const nuevo = await StockModel.create(req.body);
    res.json({ message: 'Stock creado correctamente', stock: nuevo });
  } catch (error) {
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
  try {
    await StockModel.destroy({ where: { producto_id: req.params.id } });
    res.json({ message: 'Stock eliminado' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

export const DISTRIBUIR_Stock_CTS = async (req, res) => {
  const { producto_id, local_id, lugar_id, estado_id, en_perchero, talles } =
    req.body;

  // Validación mínima
  if (
    !producto_id ||
    !local_id ||
    !lugar_id ||
    !estado_id ||
    !Array.isArray(talles) ||
    talles.length === 0
  ) {
    return res.status(400).json({
      mensajeError: 'Faltan datos obligatorios o el array de talles está vacío.'
    });
  }

  // Traer nombres una sola vez (fuera del loop)
  let producto = null,
    local = null,
    lugar = null;
  try {
    [producto, local, lugar] = await Promise.all([
      ProductosModel.findByPk(producto_id),
      LocalesModel.findByPk(local_id),
      LugaresModel.findByPk(lugar_id)
    ]);
  } catch {
    /* si falla, sku cae al fallback */
  }

  // Normalizar y ordenar talles (orden estable para locks)
  const tallesOrdenados = talles
    .filter((t) => t?.talle_id && t?.cantidad != null)
    .map((t) => ({
      talle_id: Number(t.talle_id),
      cantidad: Number(t.cantidad) || 0
    }))
    .sort((a, b) => a.talle_id - b.talle_id);

  if (tallesOrdenados.length === 0) {
    return res
      .status(400)
      .json({ mensajeError: 'No hay talles válidos para procesar.' });
  }

  // Preconstruir filas para upsert
  const filas = [];
  for (const t of tallesOrdenados) {
    let nombreTalle = null;
    try {
      const talle = await TallesModel.findByPk(t.talle_id);
      nombreTalle = talle?.nombre || null;
    } catch {
      /* ignore */
    }

    const codigo_sku =
      producto?.nombre && local?.nombre && lugar?.nombre && nombreTalle
        ? buildSku({
            productoNombre: producto.nombre,
            talleNombre: nombreTalle,
            localNombre: local.nombre,
            lugarNombre: lugar.nombre
          })
        : `${producto_id}-${t.talle_id}-${local_id}-${lugar_id}`;
    filas.push({
      producto_id,
      local_id,
      lugar_id,
      estado_id,
      talle_id: t.talle_id,
      cantidad: t.cantidad,
      en_perchero: !!en_perchero,
      codigo_sku
    });
  }

  const t = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });
  try {
    // UPSERT masivo (evita SELECT previo y evita DELETE+loop)
    await StockModel.bulkCreate(filas, {
      updateOnDuplicate: [
        'cantidad',
        'en_perchero',
        'codigo_sku',
        'updated_at'
      ],
      transaction: t
    });

    await t.commit();
    return res.json({ message: 'Stock distribuido correctamente.' });
  } catch (error) {
    await t.rollback();
    console.error('Error en DISTRIBUIR_Stock_CTS:', error);
    return res.status(500).json({ mensajeError: error.message });
  }
};

export const TRANSFERIR_Stock_CTS = async (req, res) => {
  const { grupoOriginal, nuevoGrupo, talles } = req.body;

  if (
    !grupoOriginal ||
    !nuevoGrupo ||
    !Array.isArray(talles) ||
    talles.length === 0
  ) {
    return res
      .status(400)
      .json({ mensajeError: 'Datos incompletos para transferir stock' });
  }

  const transaction = await db.transaction();
  // Traer nombres del destino una sola vez
  let prodNuevo = null,
    localNuevo = null,
    lugarNuevo = null;
  try {
    [prodNuevo, localNuevo, lugarNuevo] = await Promise.all([
      ProductosModel.findByPk(nuevoGrupo.producto_id),
      LocalesModel.findByPk(nuevoGrupo.local_id),
      LugaresModel.findByPk(nuevoGrupo.lugar_id)
    ]);
  } catch {}

  try {
    for (const { talle_id, cantidad } of talles) {
      if (!talle_id || cantidad == null) continue;

      // 1. Restar stock en grupoOriginal (si existe)
      const stockOrigen = await StockModel.findOne({
        where: {
          producto_id: grupoOriginal.producto_id,
          talle_id,
          local_id: grupoOriginal.local_id,
          lugar_id: grupoOriginal.lugar_id,
          estado_id: grupoOriginal.estado_id
        },
        transaction
      });

      if (!stockOrigen || stockOrigen.cantidad < cantidad) {
        throw new Error(
          `No hay suficiente stock en origen para talle ${talle_id}`
        );
      }

      // 🔴 **VERIFICAR VENTAS ASOCIADAS**
      const ventaAsociada = await DetalleVentaModel.findOne({
        where: { stock_id: stockOrigen.id }
      });
      if (ventaAsociada) {
        throw new Error(
          `No se puede transferir el talle ${talle_id} porque tiene ventas asociadas.`
        );
      }

      // Restar en origen o eliminar si llega a cero
      const nuevaCantidadOrigen = stockOrigen.cantidad - cantidad;
      if (nuevaCantidadOrigen <= 0) {
        await stockOrigen.destroy({ transaction });
      } else {
        await stockOrigen.update(
          { cantidad: nuevaCantidadOrigen },
          { transaction }
        );
      }

      // 2. Sumar stock en nuevoGrupo (o crear si no existe)
      const stockDestino = await StockModel.findOne({
        where: {
          producto_id: nuevoGrupo.producto_id,
          talle_id,
          local_id: nuevoGrupo.local_id,
          lugar_id: nuevoGrupo.lugar_id,
          estado_id: nuevoGrupo.estado_id
        },
        transaction
      });

      if (stockDestino) {
        await stockDestino.update(
          {
            cantidad: stockDestino.cantidad + cantidad,
            en_perchero: nuevoGrupo.en_perchero
          },
          { transaction }
        );
      } else {
        // Armado de SKU (podés hacerlo más descriptivo si querés)
        let nombreTalle = null;
        try {
          const tRow = await TallesModel.findByPk(talle_id, { transaction });
          nombreTalle = tRow?.nombre || null;
        } catch {}
        const nuevoSKU =
          prodNuevo?.nombre &&
          localNuevo?.nombre &&
          lugarNuevo?.nombre &&
          nombreTalle
            ? buildSku({
                productoNombre: prodNuevo.nombre,
                talleNombre: nombreTalle,
                localNombre: localNuevo.nombre,
                lugarNombre: lugarNuevo.nombre
              })
            : `${nuevoGrupo.producto_id}-${talle_id}-${nuevoGrupo.local_id}-${nuevoGrupo.lugar_id}`;
        await StockModel.create(
          {
            producto_id: nuevoGrupo.producto_id,
            talle_id,
            local_id: nuevoGrupo.local_id,
            lugar_id: nuevoGrupo.lugar_id,
            estado_id: nuevoGrupo.estado_id,
            cantidad,
            en_perchero: nuevoGrupo.en_perchero,
            codigo_sku: nuevoSKU
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    res.json({ message: 'Stock transferido correctamente' });
  } catch (error) {
    await transaction.rollback();
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
  const {
    nuevoNombre,
    duplicarStock = true,
    copiarCantidad = false,
    locales, // opcional: [1,2,5]
    generarSku = true // ⬅️ por defecto generamos SKU ahora
  } = req.body || {};

  if (!sourceId || !nuevoNombre?.trim()) {
    return res
      .status(400)
      .json({ mensajeError: 'Falta sourceId o nuevoNombre válido.' });
  }

  const t = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  // helper interno para asegurar unicidad de (codigo_sku, local_id)
  const ensureUniqueSku = async (baseSku, localId, excludeId = null) => {
    let candidate = baseSku;
    let i = 1;
    // Intentos con sufijos -2, -3, ...
    // (i=1 => sin sufijo; i>=2 => -i)
    // Cortamos a 150 chars por seguridad
    // Nota: excludeId evita chocar consigo mismo
    //       (cuando ya hay fila con ese id en esta misma tx).
    // Si hay muchos duplicados con el mismo nombre, sigue incrementando.
    // En la práctica no deberías superar unas pocas iteraciones.
    //
    // Usamos findOne con la transacción para ver estado consistente.
    /* eslint-disable no-constant-condition */
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
      const base = baseSku.slice(0, 150 - suffix.length);
      candidate = `${base}${suffix}`;
    }
  };

  try {
    // 1) Producto origen
    const prod = await ProductosModel.findByPk(sourceId, { transaction: t });
    if (!prod) {
      await t.rollback();
      return res
        .status(404)
        .json({ mensajeError: 'Producto origen no encontrado.' });
    }

    // 2) Crear nuevo producto (misma lógica de create)
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
        estado: prod.estado // 'activo' | 'inactivo'
      },
      { transaction: t }
    );

    // 3) (opcional) duplicar estructura de stock
    let filasStockCreadas = 0;
    if (duplicarStock) {
      const whereStock = { producto_id: sourceId };
      if (Array.isArray(locales) && locales.length > 0) {
        whereStock.local_id = { [Op.in]: locales.map(Number) };
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

      if (stockOrigen.length > 0) {
        // Primero insertamos con codigo_sku NULL para no chocar UNIQUE
        const filas = stockOrigen.map((s) => ({
          producto_id: nuevoProducto.id,
          talle_id: s.talle_id,
          local_id: s.local_id,
          lugar_id: s.lugar_id,
          estado_id: s.estado_id,
          cantidad: copiarCantidad ? Number(s.cantidad || 0) : 0, // por defecto NO copiamos inventario
          en_perchero: !!s.en_perchero,
          codigo_sku: null
        }));

        await StockModel.bulkCreate(filas, {
          transaction: t,
          ignoreDuplicates: true // ux_stock protege por si hubiera ruido previo
        });

        filasStockCreadas = filas.length;

        // 🔹 Generar SKUs ahora (legibles + únicos por local)
        if (generarSku) {
          // Necesitamos los nombres de talle/local/lugar para armar el SKU
          const nuevos = await StockModel.findAll({
            where: { producto_id: nuevoProducto.id },
            include: [
              { model: TallesModel, as: 'talle', attributes: ['nombre'] },
              { model: LocalesModel, as: 'locale', attributes: ['nombre'] },
              { model: LugaresModel, as: 'lugare', attributes: ['nombre'] }
            ],
            transaction: t
          });

          // Hacemos update por fila para poder resolver colisiones de UNIQUE
          for (const s of nuevos) {
            const base = buildSku({
              productoNombre: nuevoProducto.nombre,
              talleNombre: s.talle?.nombre,
              localNombre: s.locale?.nombre,
              lugarNombre: s.lugare?.nombre
            });

            const unique = await ensureUniqueSku(base, s.local_id, s.id);

            // Actualizamos solo si cambió (evita writes innecesarios)
            if (s.codigo_sku !== unique) {
              await s.update({ codigo_sku: unique }, { transaction: t });
            }
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

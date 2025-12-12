/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 12 / 12 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_MediosPagoComponentes.js) contiene controladores CRUD para la tabla
 * 'medios_pago_componentes', que permite definir medios de pago COMPUESTOS mediante N componentes.
 *
 * Reglas clave:
 * - medio_pago_compuesto_id debe existir y tener tipo = 'COMPUESTO'
 * - medio_pago_id debe existir y (recomendado) tipo = 'SIMPLE'
 * - No se permite que un medio sea componente de sí mismo
 * - Evita duplicados (compuesto_id + medio_id)
 *
 * Tema: Controladores - Medios de Pago (Componentes)
 * Capa: Backend
 */

import db from '../../DataBase/db.js';

import MD_TB_MediosPago from '../../Models/Ventas/MD_TB_MediosPago.js';
import MD_TB_MediosPagoComponentes from '../../Models/Ventas/MD_TB_MediosPagoComponentes.js';

const MediosPagoModel = MD_TB_MediosPago.MediosPagoModel;
const MediosPagoComponentesModel =
  MD_TB_MediosPagoComponentes.MediosPagoComponentesModel;

/**
 * Obtener TODOS los componentes (uso admin/diagnóstico)
 */
export const OBRS_MediosPagoComponentes_CTS = async (req, res) => {
  try {
    const rows = await MediosPagoComponentesModel.findAll({
      include: [
        { model: MediosPagoModel, as: 'compuesto' },
        { model: MediosPagoModel, as: 'medio' }
      ],
      order: [
        ['medio_pago_compuesto_id', 'ASC'],
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * Obtener componentes por ID de medio COMPUESTO
 * GET /medios-pago/:id/componentes
 */
export const OBRS_ComponentesByCompuesto_CTS = async (req, res) => {
  const medio_pago_compuesto_id = Number(req.params.id);

  if (!medio_pago_compuesto_id) {
    return res.status(400).json({
      mensajeError: 'medio_pago_compuesto_id inválido'
    });
  }

  try {
    const compuesto = await MediosPagoModel.findByPk(medio_pago_compuesto_id);
    if (!compuesto) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio compuesto no encontrado' });
    }
    if (compuesto.tipo !== 'COMPUESTO') {
      return res.status(400).json({
        mensajeError: 'El medio indicado no es de tipo COMPUESTO'
      });
    }

    const componentes = await MediosPagoComponentesModel.findAll({
      where: { medio_pago_compuesto_id },
      include: [
        {
          model: MediosPagoModel,
          as: 'medio',
          attributes: [
            'id',
            'nombre',
            'descripcion',
            'activo',
            'icono',
            'orden',
            'tipo',
            'ajuste_porcentual'
          ]
        }
      ],
      order: [
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });

    res.json(componentes);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * Obtener un componente por ID (fila de medios_pago_componentes)
 */
export const OBR_MedioPagoComponente_CTS = async (req, res) => {
  try {
    const row = await MediosPagoComponentesModel.findByPk(req.params.id, {
      include: [
        { model: MediosPagoModel, as: 'compuesto' },
        { model: MediosPagoModel, as: 'medio' }
      ]
    });

    if (!row) {
      return res.status(404).json({ mensajeError: 'Componente no encontrado' });
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * Crear componente
 * body: { medio_pago_compuesto_id, medio_pago_id, orden?, activo? }
 */
export const CR_MedioPagoComponente_CTS = async (req, res) => {
  const { medio_pago_compuesto_id, medio_pago_id, orden, activo } = req.body;

  if (!medio_pago_compuesto_id || !medio_pago_id) {
    return res.status(400).json({
      mensajeError: 'medio_pago_compuesto_id y medio_pago_id son obligatorios'
    });
  }

  if (Number(medio_pago_compuesto_id) === Number(medio_pago_id)) {
    return res.status(400).json({
      mensajeError: 'Un medio no puede ser componente de sí mismo'
    });
  }

  try {
    const compuesto = await MediosPagoModel.findByPk(medio_pago_compuesto_id);
    if (!compuesto) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio compuesto no encontrado' });
    }
    if (compuesto.tipo !== 'COMPUESTO') {
      return res.status(400).json({
        mensajeError: 'El medio indicado no es de tipo COMPUESTO'
      });
    }

    const medio = await MediosPagoModel.findByPk(medio_pago_id);
    if (!medio) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio componente no encontrado' });
    }
    // Recomendado: que los componentes sean SIMPLE
    if (medio.tipo !== 'SIMPLE') {
      return res.status(400).json({
        mensajeError: 'El medio componente debe ser de tipo SIMPLE'
      });
    }

    // Evitar duplicados (por UNIQUE uq_mpc también)
    const existe = await MediosPagoComponentesModel.findOne({
      where: { medio_pago_compuesto_id, medio_pago_id }
    });
    if (existe) {
      return res.status(409).json({
        mensajeError: 'Este componente ya está asignado al medio compuesto'
      });
    }

    const nuevo = await MediosPagoComponentesModel.create({
      medio_pago_compuesto_id,
      medio_pago_id,
      orden: orden || 0,
      activo: activo ?? 1
    });

    const creado = await MediosPagoComponentesModel.findByPk(nuevo.id, {
      include: [{ model: MediosPagoModel, as: 'medio' }]
    });

    res.json({
      message: 'Componente creado correctamente',
      componente: creado
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * Actualizar componente (fila)
 * Recomendación: permitir cambiar orden/activo y NO tocar IDs (a menos que lo necesites).
 */
export const UR_MedioPagoComponente_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const row = await MediosPagoComponentesModel.findByPk(id);
    if (!row) {
      return res.status(404).json({ mensajeError: 'Componente no encontrado' });
    }

    const payload = {};
    if (req.body.orden !== undefined) payload.orden = req.body.orden;
    if (req.body.activo !== undefined) payload.activo = req.body.activo;

    const [updated] = await MediosPagoComponentesModel.update(payload, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await MediosPagoComponentesModel.findByPk(id, {
        include: [{ model: MediosPagoModel, as: 'medio' }]
      });
      return res.json({
        message: 'Componente actualizado correctamente',
        actualizado
      });
    }

    res
      .status(400)
      .json({ mensajeError: 'No se pudo actualizar el componente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * Eliminar componente (fila)
 */
export const ER_MedioPagoComponente_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const eliminado = await MediosPagoComponentesModel.destroy({
      where: { id }
    });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Componente no encontrado' });
    }

    res.json({ message: 'Componente eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({
      mensajeError: 'Error del servidor',
      detalle: error.message
    });
  }
};

/**
 * (OPCIONAL pero MUY útil para el modal del front)
 * Reemplazar TODA la lista de componentes de un medio compuesto en una sola llamada (bulk).
 *
 * PUT /medios-pago/:id/componentes
 * body: { componentes: [{ medio_pago_id, orden?, activo? }, ...] }
 */
export const UR_ComponentesBulkByCompuesto_CTS = async (req, res) => {
  const medio_pago_compuesto_id = Number(req.params.id);
  const { componentes } = req.body;

  if (!medio_pago_compuesto_id) {
    return res
      .status(400)
      .json({ mensajeError: 'ID de medio compuesto inválido' });
  }
  if (!Array.isArray(componentes) || componentes.length < 2) {
    return res.status(400).json({
      mensajeError: 'Debe enviar un array de componentes (mínimo 2)'
    });
  }

  try {
    const compuesto = await MediosPagoModel.findByPk(medio_pago_compuesto_id);
    if (!compuesto) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio compuesto no encontrado' });
    }
    if (compuesto.tipo !== 'COMPUESTO') {
      return res.status(400).json({
        mensajeError: 'El medio indicado no es de tipo COMPUESTO'
      });
    }

    // Validación rápida: sin duplicados, sin self
    const ids = componentes.map((c) => Number(c.medio_pago_id)).filter(Boolean);
    const setIds = new Set(ids);
    if (setIds.size !== ids.length) {
      return res
        .status(400)
        .json({ mensajeError: 'No se permiten componentes duplicados' });
    }
    if (setIds.has(medio_pago_compuesto_id)) {
      return res
        .status(400)
        .json({ mensajeError: 'Un medio no puede ser componente de sí mismo' });
    }

    // Validar que todos existan y sean SIMPLE
    const medios = await MediosPagoModel.findAll({ where: { id: ids } });
    if (medios.length !== ids.length) {
      return res
        .status(400)
        .json({ mensajeError: 'Uno o más medios componente no existen' });
    }
    const noSimple = medios.find((m) => m.tipo !== 'SIMPLE');
    if (noSimple) {
      return res.status(400).json({
        mensajeError: `El medio componente '${noSimple.nombre}' debe ser de tipo SIMPLE`
      });
    }

    await db.transaction(async (t) => {
      await MediosPagoComponentesModel.destroy({
        where: { medio_pago_compuesto_id },
        transaction: t
      });

      const payload = componentes.map((c, idx) => ({
        medio_pago_compuesto_id,
        medio_pago_id: Number(c.medio_pago_id),
        orden: c.orden ?? idx,
        activo: c.activo ?? 1
      }));

      await MediosPagoComponentesModel.bulkCreate(payload, { transaction: t });
    });

    const lista = await MediosPagoComponentesModel.findAll({
      where: { medio_pago_compuesto_id },
      include: [{ model: MediosPagoModel, as: 'medio' }],
      order: [
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });

    res.json({
      message: 'Componentes actualizados correctamente',
      componentes: lista
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

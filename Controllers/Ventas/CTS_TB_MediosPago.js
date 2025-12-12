/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 30 / 06 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Controladores CRUD para 'medios_pago'.
 * Ajustes:
 * - Soporta campo 'tipo' (SIMPLE | COMPUESTO)
 * - Validaciones mínimas para medios compuestos
 * - Eliminación segura cuando hay componentes asociados
 *
 * Tema: Controladores - Medios de Pago
 * Capa: Backend
 */

import db from '../../DataBase/db.js';

// Importar modelos
import MD_TB_MediosPago from '../../Models/Ventas/MD_TB_MediosPago.js';
import MD_TB_MediosPagoComponentes from '../../Models/Ventas/MD_TB_MediosPagoComponentes.js';

const MediosPagoModel = MD_TB_MediosPago.MediosPagoModel;
const MediosPagoComponentesModel =
  MD_TB_MediosPagoComponentes.MediosPagoComponentesModel;

const TIPOS_VALIDOS = new Set(['SIMPLE', 'COMPUESTO']);

// Obtener todos los medios de pago
export const OBRS_MediosPago_CTS = async (req, res) => {
  try {
    // Si algún día querés devolver componentes en el mismo listado:
    // const withComponentes = String(req.query.with_componentes || '') === '1';

    const medios = await MediosPagoModel.findAll({
      order: [
        ['orden', 'ASC'],
        ['nombre', 'ASC']
      ]
      // include: withComponentes ? [{ model: MediosPagoComponentesModel, as: 'componentes', include: [{ model: MediosPagoModel, as: 'medio' }] }] : []
    });

    res.json(medios);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo medio de pago por ID
export const OBR_MedioPago_CTS = async (req, res) => {
  try {
    const medio = await MediosPagoModel.findByPk(req.params.id);
    if (!medio) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio de pago no encontrado' });
    }
    res.json(medio);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo medio de pago
export const CR_MedioPago_CTS = async (req, res) => {
  const { nombre, descripcion, icono, orden, ajuste_porcentual, activo, tipo } =
    req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ mensajeError: 'El nombre del medio de pago es obligatorio' });
  }

  const tipoFinal = tipo ? String(tipo).toUpperCase() : 'SIMPLE';
  if (!TIPOS_VALIDOS.has(tipoFinal)) {
    return res.status(400).json({
      mensajeError: "Tipo inválido. Valores permitidos: 'SIMPLE' | 'COMPUESTO'"
    });
  }

  try {
    const nuevo = await MediosPagoModel.create({
      nombre: String(nombre).trim(),
      descripcion: descripcion || '',
      icono: icono || '',
      orden: orden || 0,
      activo: activo ?? 1,
      tipo: tipoFinal,
      // Recomendación: el compuesto no debería tener ajuste propio
      ajuste_porcentual: tipoFinal === 'COMPUESTO' ? 0 : ajuste_porcentual || 0
    });

    res.json({ message: 'Medio de pago creado correctamente', medio: nuevo });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un medio de pago
export const ER_MedioPago_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const medio = await MediosPagoModel.findByPk(id);
    if (!medio) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio de pago no encontrado' });
    }

    // Si el medio es COMPONENTE de algún compuesto, NO borrar (rompe integridad)
    const usadoComoComponente = await MediosPagoComponentesModel.count({
      where: { medio_pago_id: id }
    });

    if (usadoComoComponente > 0) {
      return res.status(409).json({
        mensajeError:
          'No se puede eliminar: este medio está siendo utilizado como componente en uno o más medios compuestos. Desactivalo (activo=0) o quitá la relación primero.'
      });
    }

    // Si es COMPUESTO, borrar primero sus filas hijas y luego el medio (en transacción)
    if (medio.tipo === 'COMPUESTO') {
      await db.transaction(async (t) => {
        await MediosPagoComponentesModel.destroy({
          where: { medio_pago_compuesto_id: id },
          transaction: t
        });

        await MediosPagoModel.destroy({ where: { id }, transaction: t });
      });

      return res.json({
        message:
          'Medio compuesto eliminado correctamente (incluyendo componentes).'
      });
    }

    // SIMPLE: eliminar normal
    const eliminado = await MediosPagoModel.destroy({ where: { id } });
    if (!eliminado) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio de pago no encontrado' });
    }

    res.json({ message: 'Medio de pago eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({
      mensajeError: 'Error del servidor',
      detalle: error.message
    });
  }
};

// Actualizar un medio de pago
export const UR_MedioPago_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const medio = await MediosPagoModel.findByPk(id);
    if (!medio) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio de pago no encontrado' });
    }

    // Whitelist de campos permitidos
    const payload = {};
    if (req.body.nombre !== undefined)
      payload.nombre = String(req.body.nombre).trim();
    if (req.body.descripcion !== undefined)
      payload.descripcion = req.body.descripcion || '';
    if (req.body.icono !== undefined) payload.icono = req.body.icono || '';
    if (req.body.orden !== undefined) payload.orden = req.body.orden || 0;
    if (req.body.activo !== undefined) payload.activo = req.body.activo;

    // tipo
    if (req.body.tipo !== undefined) {
      const tipoNuevo = String(req.body.tipo).toUpperCase();
      if (!TIPOS_VALIDOS.has(tipoNuevo)) {
        return res.status(400).json({
          mensajeError:
            "Tipo inválido. Valores permitidos: 'SIMPLE' | 'COMPUESTO'"
        });
      }

      // Si intenta pasar COMPUESTO -> SIMPLE y tiene componentes, bloquear
      if (medio.tipo === 'COMPUESTO' && tipoNuevo === 'SIMPLE') {
        const cant = await MediosPagoComponentesModel.count({
          where: { medio_pago_compuesto_id: id }
        });
        if (cant > 0) {
          return res.status(409).json({
            mensajeError:
              'No se puede cambiar a SIMPLE: el medio tiene componentes asociados. Quitá los componentes primero.'
          });
        }
      }

      payload.tipo = tipoNuevo;

      // Si queda como COMPUESTO, forzamos ajuste a 0
      if (tipoNuevo === 'COMPUESTO') payload.ajuste_porcentual = 0;
    }

    // ajuste_porcentual (solo si es SIMPLE)
    if (req.body.ajuste_porcentual !== undefined) {
      const tipoFinal = payload.tipo || medio.tipo;
      if (tipoFinal === 'COMPUESTO') {
        payload.ajuste_porcentual = 0;
      } else {
        payload.ajuste_porcentual = req.body.ajuste_porcentual || 0;
      }
    }

    const [updated] = await MediosPagoModel.update(payload, { where: { id } });

    if (updated === 1) {
      const actualizado = await MediosPagoModel.findByPk(id);
      return res.json({
        message: 'Medio de pago actualizado correctamente',
        actualizado
      });
    }

    res
      .status(400)
      .json({ mensajeError: 'No se pudo actualizar el medio de pago' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 28 / 07 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Controladores para asignación de clientes a campañas (tracking WhatsApp).
 *
 * Tema: Controladores - Recaptación
 * Capa: Backend
 */

import { Op, literal, fn, col } from 'sequelize';
import db from '../../DataBase/db.js';
import { RecaptacionClientesModel } from '../../Models/Recaptacion/MD_TB_RecaptacionClientes.js';
import { RecaptacionCampanasModel } from '../../Models/Recaptacion/MD_TB_RecaptacionCampanas.js';
import MD_TB_Clientes from '../../Models/MD_TB_Clientes.js';

const ClienteModel = MD_TB_Clientes.ClienteModel;

/* =========================================================
   LISTAR (con filtros y paginación)
   GET /recaptacion-clientes?campana_id=&status=&q=&limit=&offset=
   ========================================================= */
export const OBRS_RecaptacionClientes_CTS = async (req, res) => {
  try {
    const { campana_id, status, q, limit = 200, offset = 0 } = req.query;

    const where = {};
    if (campana_id) where.campana_id = Number(campana_id);
    if (status) where.status = status;

    const include = [
      { model: ClienteModel, attributes: ['id', 'nombre', 'email', 'telefono', 'telefono_e164', 'dni'] },
      { model: RecaptacionCampanasModel, attributes: ['id', 'nombre', 'medio_envio', 'send_status'] }
    ];

    // Búsqueda por nombre/email/dni/teléfono
    if (q && q.trim().length >= 2) {
      const s = q.trim();
      const isNum = /^\d+$/.test(s);
      include[0].where = isNum
        ? {
            [Op.or]: [
              { dni: s },
              { telefono: { [Op.like]: `%${s}%` } },
              { telefono_e164: { [Op.like]: `%${s}%` } }
            ]
          }
        : {
            [Op.or]: [{ nombre: { [Op.like]: `%${s}%` } }, { email: { [Op.like]: `%${s}%` } }]
          };
    }

    const asignaciones = await RecaptacionClientesModel.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(asignaciones);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   OBTENER por ID (con include)
   GET /recaptacion-clientes/:id
   ========================================================= */
export const OBR_RecaptacionCliente_CTS = async (req, res) => {
  try {
    const row = await RecaptacionClientesModel.findByPk(req.params.id, {
      include: [
        { model: ClienteModel, attributes: ['id', 'nombre', 'email', 'telefono', 'telefono_e164', 'dni'] },
        { model: RecaptacionCampanasModel, attributes: ['id', 'nombre', 'medio_envio', 'send_status'] }
      ]
    });
    if (!row) return res.status(404).json({ mensajeError: 'Asignación no encontrada' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   CREAR (respeta UNIQUE campana_id+cliente_id)
   POST /recaptacion-clientes
   body: { cliente_id, campana_id, respuesta?, wa_to? }
   - Si no viene wa_to, usa clientes.telefono_e164
   - Valida elegibilidad básica: opt_in, !blocked, E.164
   ========================================================= */
export const CR_RecaptacionCliente_CTS = async (req, res) => {
  const { cliente_id, campana_id, respuesta, wa_to } = req.body;

  if (!cliente_id || !campana_id) {
    return res.status(400).json({ mensajeError: 'cliente_id y campana_id son obligatorios' });
  }

  try {
    const cliente = await ClienteModel.findByPk(cliente_id, {
      attributes: ['id', 'wa_opt_in', 'wa_blocked', 'telefono_e164']
    });
    if (!cliente) return res.status(404).json({ mensajeError: 'Cliente no encontrado' });

    // Validar elegibilidad básica (para WhatsApp)
    const finalTo = wa_to || cliente.telefono_e164 || null;
    if (!finalTo || !cliente.wa_opt_in || cliente.wa_blocked) {
      return res.status(400).json({ mensajeError: 'Cliente no elegible: requiere opt-in, no bloqueado y teléfono E.164' });
    }

    // UPSERT “manual”: intentamos crear; si viola UNIQUE, actualizamos
    let asignacion;
    try {
      asignacion = await RecaptacionClientesModel.create({
        cliente_id,
        campana_id,
        wa_to: finalTo,
        status: 'queued',
        respuesta: respuesta || null
      });
    } catch (err) {
      // Si fue por UNIQUE, hacemos update
      if (String(err.message).includes('uq_recaptacion_campana_cliente')) {
        await RecaptacionClientesModel.update(
          { wa_to: finalTo, respuesta: respuesta || null, status: 'queued' },
          { where: { campana_id, cliente_id } }
        );
        asignacion = await RecaptacionClientesModel.findOne({ where: { campana_id, cliente_id } });
      } else {
        throw err;
      }
    }

    res.json({ message: 'Asignación registrada correctamente', asignacion });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   ACTUALIZAR RESPUESTA
   PUT /recaptacion-clientes/:id/respuesta
   body: { respuesta }
   ========================================================= */
export const UR_RespuestaRecaptacion_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const { respuesta } = req.body;

    const [updated] = await RecaptacionClientesModel.update(
      { respuesta },
      { where: { id } }
    );

    if (updated !== 1) return res.status(404).json({ mensajeError: 'Asignación no encontrada' });
    const actualizado = await RecaptacionClientesModel.findByPk(id);
    res.json({ message: 'Respuesta actualizada correctamente', actualizado });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   ACTUALIZAR STATUS (uso operativo/manual)
   PUT /recaptacion-clientes/:id/status
   body: { status }
   ========================================================= */
export const UR_StatusRecaptacion_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['queued', 'sent', 'delivered', 'read', 'failed', 'opted_out', 'blocked'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ mensajeError: 'Status inválido' });
    }

    const [updated] = await RecaptacionClientesModel.update(
      { status, last_event_at: new Date() },
      { where: { id } }
    );

    if (updated !== 1) return res.status(404).json({ mensajeError: 'Asignación no encontrada' });
    const actualizado = await RecaptacionClientesModel.findByPk(id);
    res.json({ message: 'Estado actualizado', actualizado });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   REINTENTAR FALLIDOS (o re-encolar pendientes)
   POST /recaptacion-clientes/retry
   body: { campana_id, onlyFailed=true }
   - Pone status='queued' para failed (y opcionalmente sent que no tuvieron webhook)
   ========================================================= */
export const POST_RecaptacionClientes_Retry_CTS = async (req, res) => {
  try {
    const { campana_id, onlyFailed = true } = req.body;
    if (!campana_id) return res.status(400).json({ mensajeError: 'campana_id es obligatorio' });

    const where = { campana_id: Number(campana_id) };
    if (onlyFailed) where.status = 'failed';
    else where.status = { [Op.in]: ['failed', 'queued'] }; // o ampliar según tu flujo

    const [n] = await RecaptacionClientesModel.update(
      { status: 'queued' },
      { where }
    );

    res.json({ message: 'Reencolado realizado', cantidad: n });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   ACTUALIZAR POR MESSAGE_ID (para usar desde webhook si preferís enrutar acá)
   PUT /recaptacion-clientes/by-message
   body: { wa_message_id, status, error_code?, error_message? }
   ========================================================= */
export const PUT_RecaptacionCliente_ByMessageId_CTS = async (req, res) => {
  try {
    const { wa_message_id, status, error_code, error_message } = req.body;
    if (!wa_message_id || !status) {
      return res.status(400).json({ mensajeError: 'wa_message_id y status son obligatorios' });
    }

    const allowed = ['sent', 'delivered', 'read', 'failed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ mensajeError: 'Status inválido' });
    }

    const [n] = await RecaptacionClientesModel.update(
      {
        status,
        error_code: error_code || null,
        error_message: error_message || null,
        last_event_at: new Date()
      },
      { where: { wa_message_id } }
    );

    if (n === 0) return res.status(404).json({ mensajeError: 'Registro no encontrado por wa_message_id' });
    res.json({ message: 'Actualizado por message_id', cantidad: n });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   ELIMINAR
   DELETE /recaptacion-clientes/:id
   ========================================================= */
export const ER_RecaptacionCliente_CTS = async (req, res) => {
  try {
    const eliminado = await RecaptacionClientesModel.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ mensajeError: 'Asignación no encontrada' });
    res.json({ message: 'Asignación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   MÉTRICAS RÁPIDAS POR CAMPAÑA (opc.)
   GET /recaptacion-clientes/metrics?campana_id=#
   ========================================================= */
export const OBR_RecaptacionClientes_Metrics_CTS = async (req, res) => {
  try {
    const { campana_id } = req.query;
    if (!campana_id) return res.status(400).json({ mensajeError: 'campana_id es obligatorio' });

    const rows = await RecaptacionClientesModel.findAll({
      where: { campana_id: Number(campana_id) },
      attributes: ['status', [fn('COUNT', col('id')), 'cantidad']],
      group: ['status']
    });

    const base = {
      total: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, opted_out: 0, blocked: 0
    };
    for (const r of rows) {
      const s = r.get('status');
      const c = Number(r.get('cantidad'));
      base.total += c;
      if (base[s] !== undefined) base[s] += c;
    }
    res.json(base);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};


/* =========================================================
   REGISTRAR ENVÍO (log + auditoría)
   POST /recaptacion-campanas/:campana_id/log-send
   body: { cliente_id, wa_to?, mensaje_rendered, sent_by_id?, sent_by? }
   - Crea si no existe (attempt_no=1) con status='sent'
   - Si existe, incrementa attempt_no y pisa campos relevantes
   ========================================================= */
export const POST_RecaptacionClientes_LogSend_CTS = async (req, res) => {
  const t = await db.transaction();
  try {
    const { campana_id } = req.params;
    const {
      cliente_id,
      wa_to = null,
      mensaje_rendered = null,
      sent_by_id = null,   // ⬅️ user_id del front
      sent_by = null       // opcional: nombre legible
    } = req.body || {};

    if (!campana_id || !cliente_id) {
      await t.rollback();
      return res.status(400).json({ mensajeError: 'campana_id y cliente_id son obligatorios' });
    }

    // Buscar asignación única por (campana, cliente)
    let rc = await RecaptacionClientesModel.findOne({
      where: { campana_id: Number(campana_id), cliente_id: Number(cliente_id) },
      transaction: t
    });

    if (!rc) {
      // primer envío: attempt_no = 1
      rc = await RecaptacionClientesModel.create(
        {
          campana_id: Number(campana_id),
          cliente_id: Number(cliente_id),
          wa_to,
          status: 'sent',
          wa_message_id: null,
          error_code: null,
          error_message: null,
          retries: 0,
          last_event_at: new Date(),
          fecha_envio: new Date(),
          respuesta: null,
          mensaje_rendered,
          attempt_no: 1,
          sent_by,
          sent_by_id,
          created_at: new Date(),
          updated_at: new Date()
        },
        { transaction: t }
      );
    } else {
      // ya existía => incrementa intento
      const nextAttempt = (rc.attempt_no || 0) + 1;

      await rc.update(
        {
          wa_to: wa_to ?? rc.wa_to,
          status: 'sent',
          mensaje_rendered: mensaje_rendered ?? rc.mensaje_rendered,
          attempt_no: nextAttempt,
          sent_by: sent_by ?? rc.sent_by,
          sent_by_id: sent_by_id ?? rc.sent_by_id,
          fecha_envio: new Date(),
          last_event_at: new Date(),
          updated_at: new Date()
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.json({ message: 'Envío registrado', item: rc });
  } catch (error) {
    await t.rollback();
    console.error('POST_RecaptacionClientes_LogSend_CTS error:', error);
    return res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================
   TRACKING por (campana_id, cliente_id)
   PUT /recaptacion-clientes/track
   body: { campana_id, cliente_id, status, wa_message_id?, error_code?, error_message?, event_at? }
   - Crea si no existe (status='queued', attempt_no=1)
   - Actualiza status, last_event_at, wa_message_id, errores
   - Si status='failed' => retries+1
   ========================================================= */
export const PUT_RecaptacionCliente_TrackByCampanaCliente_CTS = async (req, res) => {
  const t = await db.transaction();
  try {
    const {
      campana_id,
      cliente_id,
      status,
      wa_message_id = null,
      error_code = null,
      error_message = null,
      event_at = null
    } = req.body || {};

    const allowed = ['queued', 'sent', 'delivered', 'read', 'failed', 'opted_out', 'blocked'];
    if (!campana_id || !cliente_id || !status || !allowed.includes(status)) {
      await t.rollback();
      return res.status(400).json({ mensajeError: 'campana_id, cliente_id y status válido son obligatorios' });
    }

    let rc = await RecaptacionClientesModel.findOne({
      where: { campana_id: Number(campana_id), cliente_id: Number(cliente_id) },
      transaction: t
    });

    if (!rc) {
      // alta con valores base
      rc = await RecaptacionClientesModel.create(
        {
          campana_id: Number(campana_id),
          cliente_id: Number(cliente_id),
          status: 'queued',
          attempt_no: 1,
          retries: 0,
          fecha_envio: new Date(),
          created_at: new Date()
        },
        { transaction: t }
      );
    }

    const nextRetries = status === 'failed' ? (rc.retries || 0) + 1 : rc.retries || 0;

    await rc.update(
      {
        status,
        wa_message_id,
        error_code,
        error_message,
        retries: nextRetries,
        last_event_at: event_at ? new Date(event_at) : new Date(),
        updated_at: new Date()
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({ message: 'Tracking actualizado', item: rc });
  } catch (error) {
    await t.rollback();
    console.error('PUT_RecaptacionCliente_TrackByCampanaCliente_CTS error:', error);
    return res.status(500).json({ mensajeError: error.message });
  }
};


export default {
  OBRS_RecaptacionClientes_CTS,
  OBR_RecaptacionCliente_CTS,
  CR_RecaptacionCliente_CTS,
  UR_RespuestaRecaptacion_CTS,
  UR_StatusRecaptacion_CTS,
  POST_RecaptacionClientes_Retry_CTS,
  PUT_RecaptacionCliente_ByMessageId_CTS,
  ER_RecaptacionCliente_CTS,
  OBR_RecaptacionClientes_Metrics_CTS
};

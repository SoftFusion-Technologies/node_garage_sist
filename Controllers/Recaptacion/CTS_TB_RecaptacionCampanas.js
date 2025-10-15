/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 28 / 07 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Controladores para campañas de recaptación con soporte de WhatsApp:
 * - CRUD con validaciones
 * - Filtros por medio, estado y fechas
 * - Queue de envíos (inserta recaptacion_clientes con status='queued')
 * - Pausa / Resume
 * - Estado (métricas por campaña)
 *
 * Tema: Controladores - Recaptación
 * Capa: Backend
 */

import { Op, literal } from 'sequelize';
import db from '../../DataBase/db.js';
import { RecaptacionCampanasModel } from '../../Models/Recaptacion/MD_TB_RecaptacionCampanas.js';
import { RecaptacionClientesModel } from '../../Models/Recaptacion/MD_TB_RecaptacionClientes.js';
import MD_TB_Clientes from '../../Models/MD_TB_Clientes.js';

const ClienteModel = MD_TB_Clientes.ClienteModel;

/* =========================
   LISTAR con filtros
   ========================= */
export const OBRS_RecaptacionCampanas_CTS = async (req, res) => {
  try {
    const {
      medio,
      estado,
      send_status,
      desde,
      hasta,
      q,
      limit = 100,
      offset = 0
    } = req.query;
    const where = {};

    if (medio) where.medio_envio = medio;
    if (estado) where.estado = estado;
    if (send_status) where.send_status = send_status;

    if (desde) where.fecha_inicio = { [Op.gte]: new Date(desde) };
    if (hasta)
      where.fecha_fin = Object.assign(where.fecha_fin || {}, {
        [Op.lte]: new Date(hasta)
      });

    if (q && q.trim().length >= 2) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q.trim()}%` } },
        { descripcion: { [Op.like]: `%${q.trim()}%` } }
      ];
    }

    const campanas = await RecaptacionCampanasModel.findAll({
      where,
      order: [['id', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(campanas);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   OBTENER por ID
   ========================= */
export const OBR_RecaptacionCampana_CTS = async (req, res) => {
  try {
    const campana = await RecaptacionCampanasModel.findByPk(req.params.id);
    if (!campana)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });
    res.json(campana);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   CREAR
   ========================= */
export const CR_RecaptacionCampana_CTS = async (req, res) => {
  const {
    nombre,
    descripcion,
    fecha_inicio,
    fecha_fin,
    medio_envio,
    mensaje,
    template_name,
    template_lang = 'es',
    template_vars,
    sender_phone_number_id,
    created_by
  } = req.body;

  if (!nombre || !fecha_inicio || !fecha_fin || !medio_envio || !mensaje) {
    return res.status(400).json({ mensajeError: 'Faltan campos obligatorios' });
  }

  try {
    const nueva = await RecaptacionCampanasModel.create({
      nombre,
      descripcion,
      fecha_inicio,
      fecha_fin,
      medio_envio,
      mensaje,
      template_name,
      template_lang,
      template_vars: template_vars ?? null,
      sender_phone_number_id,
      send_status: 'draft',
      created_by
    });

    res.json({ message: 'Campaña creada correctamente', campana: nueva });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   ACTUALIZAR
   - Si la campaña ya está queued/sending/finished, limitar cambios críticos
   ========================= */
export const UR_RecaptacionCampana_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await RecaptacionCampanasModel.findByPk(id);
    if (!camp)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });

    const blockedStatuses = ['queued', 'sending', 'finished'];
    if (blockedStatuses.includes(camp.send_status)) {
      // Permitimos solo cambios “seguros”
      const allowed = (({ descripcion, estado }) => ({ descripcion, estado }))(
        req.body || {}
      );
      await RecaptacionCampanasModel.update(allowed, { where: { id } });
    } else {
      await RecaptacionCampanasModel.update(req.body, { where: { id } });
    }

    const actualizada = await RecaptacionCampanasModel.findByPk(id);
    res.json({ message: 'Campaña actualizada correctamente', actualizada });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   ELIMINAR
   ========================= */
export const ER_RecaptacionCampana_CTS = async (req, res) => {
  try {
    const eliminado = await RecaptacionCampanasModel.destroy({
      where: { id: req.params.id }
    });
    if (!eliminado)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });
    res.json({ message: 'Campaña eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   QUEUE de envíos (selección manual de clientes)
   Body: { cliente_ids: number[] }
   - Valida: medio = 'whatsapp', fechas vigentes, plantilla/config WA
   - Inserta recaptacion_clientes (UNIQUE campana_id+cliente_id evita duplicados)
   - Solo clientes elegibles: wa_opt_in=1, !wa_blocked, telefono_e164 no nulo
   ========================= */
export const POST_RecaptacionCampana_Queue_CTS = async (req, res) => {
  const { id } = req.params;
  const { cliente_ids = [] } = req.body || {};

  if (!Array.isArray(cliente_ids) || cliente_ids.length === 0) {
    return res
      .status(400)
      .json({ mensajeError: 'Debe enviar al menos un cliente.' });
  }

  try {
    const camp = await RecaptacionCampanasModel.findByPk(id);
    if (!camp)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });

    if (camp.medio_envio !== 'whatsapp') {
      return res
        .status(400)
        .json({
          mensajeError: 'Solo se admite queue para medio_envio=whatsapp.'
        });
    }

    // Validaciones mínimas para Cloud API
    if (!camp.sender_phone_number_id) {
      return res
        .status(400)
        .json({ mensajeError: 'Falta sender_phone_number_id en la campaña.' });
    }
    if (!camp.template_name) {
      return res
        .status(400)
        .json({
          mensajeError: 'Falta template_name (plantilla WA) en la campaña.'
        });
    }

    // Rango de fechas (opcionalmente exigimos estar vigente)
    const now = new Date();
    if (camp.fecha_inicio && now < new Date(camp.fecha_inicio)) {
      return res
        .status(400)
        .json({ mensajeError: 'La campaña aún no comenzó.' });
    }
    if (camp.fecha_fin && now > new Date(camp.fecha_fin)) {
      return res.status(400).json({ mensajeError: 'La campaña ya finalizó.' });
    }

    // Traer clientes elegibles por IDs
    const clientes = await ClienteModel.findAll({
      where: {
        id: { [Op.in]: cliente_ids },
        wa_opt_in: true,
        wa_blocked: false,
        telefono_e164: { [Op.ne]: null }
      },
      attributes: ['id', 'telefono_e164']
    });

    if (clientes.length === 0) {
      return res
        .status(400)
        .json({
          mensajeError:
            'Ninguno de los clientes seleccionados es elegible (opt-in/teléfono inválido/bloqueado).'
        });
    }

    // Armado de registros para recaptacion_clientes
    const rows = clientes.map((c) => ({
      cliente_id: c.id,
      campana_id: camp.id,
      wa_to: c.telefono_e164,
      status: 'queued'
    }));

    // Insert masivo con UPSERT de la UNIQUE (campana_id, cliente_id)
    await RecaptacionClientesModel.bulkCreate(rows, {
      ignoreDuplicates: true, // si ya existe, ignora (MySQL)
      updateOnDuplicate: ['wa_to', 'status'] // si existe, actualiza estos
    });

    // Actualizamos estado de campaña a queued si estaba en draft
    if (camp.send_status === 'draft' || camp.send_status === 'paused') {
      await RecaptacionCampanasModel.update(
        { send_status: 'queued' },
        { where: { id: camp.id } }
      );
    }

    res.json({
      message: 'Clientes encolados correctamente',
      total_seleccionados: cliente_ids.length,
      total_elegibles: clientes.length
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   PAUSAR / REANUDAR
   ========================= */
export const POST_RecaptacionCampana_Pause_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await RecaptacionCampanasModel.findByPk(id);
    if (!camp)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });

    await RecaptacionCampanasModel.update(
      { send_status: 'paused' },
      { where: { id } }
    );
    res.json({ message: 'Campaña pausada' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

export const POST_RecaptacionCampana_Resume_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await RecaptacionCampanasModel.findByPk(id);
    if (!camp)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });

    // Solo permitir resume si estaba pausada/queued/draft
    const allowed = ['paused', 'queued', 'draft'];
    const next = allowed.includes(camp.send_status)
      ? 'queued'
      : camp.send_status;
    await RecaptacionCampanasModel.update(
      { send_status: next },
      { where: { id } }
    );

    res.json({ message: 'Campaña reanudada', send_status: next });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   ESTADO / MÉTRICAS
   ========================= */
export const OBR_RecaptacionCampana_Estado_CTS = async (req, res) => {
  try {
    const { id } = req.params;

    const camp = await RecaptacionCampanasModel.findByPk(id);
    if (!camp)
      return res.status(404).json({ mensajeError: 'Campaña no encontrada' });

    const rows = await RecaptacionClientesModel.findAll({
      where: { campana_id: id },
      attributes: ['status', [db.fn('COUNT', db.col('id')), 'cantidad']],
      group: ['status']
    });

    const base = {
      total: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      opted_out: 0,
      blocked: 0
    };
    for (const r of rows) {
      const s = r.get('status');
      const c = Number(r.get('cantidad'));
      base.total += c;
      if (base[s] !== undefined) base[s] += c;
    }

    res.json({
      campana: camp,
      metrics: base
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};


// Marca como ENVIADO (optimista) un contacto individual
export const POST_RecaptacionCampana_LogSend_CTS = async (req, res) => {
  try {
    const { id } = req.params; // campana_id
    const { cliente_id, wa_to, mensaje_preview } = req.body || {};

    if (!cliente_id) return res.status(400).json({ mensajeError: 'cliente_id es obligatorio' });

    // Verificar que la campaña exista
    const camp = await RecaptacionCampanasModel.findByPk(id);
    if (!camp) return res.status(404).json({ mensajeError: 'Campaña no encontrada' });

    // Upsert en recaptacion_clientes (UNIQUE campana_id+cliente_id ya existe)
    await RecaptacionClientesModel.bulkCreate([{
      cliente_id,
      campana_id: camp.id,
      wa_to: wa_to || null,
      status: 'sent',
      fecha_envio: new Date(),
      last_event_at: new Date(),
      // opcional: podés guardar mensaje_preview en una columna si la agregás
    }], {
      ignoreDuplicates: true,
      updateOnDuplicate: ['wa_to', 'status', 'fecha_envio', 'last_event_at']
    });

    return res.json({ message: 'Envío registrado (sent)' });
  } catch (e) {
    return res.status(500).json({ mensajeError: e.message });
  }
};

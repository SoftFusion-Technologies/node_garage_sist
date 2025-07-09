/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Clientes.js) contiene controladores para manejar operaciones CRUD sobre la tabla de clientes.
 *
 * Tema: Controladores - Clientes
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_Clientes from '../Models/MD_TB_Clientes.js';
import { VentasModel } from '../Models/Ventas/MD_TB_Ventas.js';
const ClienteModel = MD_TB_Clientes.ClienteModel;
import { Op } from 'sequelize';

// Obtener todos los clientes
export const OBRS_Clientes_CTS = async (req, res) => {
  try {
    const clientes = await ClienteModel.findAll({
      order: [['id', 'DESC']]
    });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo cliente por ID
export const OBR_Cliente_CTS = async (req, res) => {
  try {
    const cliente = await ClienteModel.findByPk(req.params.id);
    if (!cliente)
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo cliente
export const CR_Cliente_CTS = async (req, res) => {
  const { nombre, telefono, email, direccion, dni } = req.body;

  if (!nombre) {
    return res.status(400).json({
      mensajeError: 'Falta el campo obligatorio: nombre'
    });
  }

  try {
    const nuevo = await ClienteModel.create({
      nombre,
      telefono,
      email,
      direccion,
      dni
    });
    res.json({ message: 'Cliente creado correctamente', cliente: nuevo });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un cliente
export const ER_Cliente_CTS = async (req, res) => {
  try {
    const eliminado = await ClienteModel.destroy({
      where: { id: req.params.id }
    });

    if (!eliminado)
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un cliente
export const UR_Cliente_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await ClienteModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await ClienteModel.findByPk(id);
      res.json({ message: 'Cliente actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Buscar clientes por nombre, DNI, teléfono o email (búsqueda rápida/autosuggest)
// Buscar clientes por nombre, DNI, teléfono o email (búsqueda rápida/autosuggest)
export const SEARCH_Clientes_CTS = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.json([]);
    const cleanQuery = query.trim().replace(/\s/g, '');

    // Si la query es numérica: buscar coincidencia exacta de DNI
    if (/^\d+$/.test(cleanQuery)) {
      const clientes = await ClienteModel.findAll({
        where: {
          [Op.and]: [
            { dni: cleanQuery },
            { dni: { [Op.notIn]: ['', 'Sin DNI'] } }   // <--- QUITÁ null
          ]
        }
      });
      if (clientes.length > 0) return res.json(clientes);
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    }

    // Si es texto: buscar por nombre o email parcial
    const clientes = await ClienteModel.findAll({
      where: {
        [Op.or]: [
          { nombre: { [Op.like]: `%${cleanQuery}%` } },
          { email: { [Op.like]: `%${cleanQuery}%` } }
        ]
      }
    });

    if (clientes.length > 0) return res.json(clientes);
    return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Endpoint: obtener historial de compras de un cliente
export const OBR_HistorialComprasCliente_CTS = async (req, res) => {
  try {
    const clienteId = req.params.id;
    // Trae ventas + suma total gastado
    const ventas = await VentasModel.findAll({
      where: { cliente_id: clienteId },
      order: [['fecha', 'DESC']],
      attributes: ['id', 'fecha', 'total'],
    });

    res.json(ventas);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
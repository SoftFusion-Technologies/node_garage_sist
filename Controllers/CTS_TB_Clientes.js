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

const ClienteModel = MD_TB_Clientes.ClienteModel;

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

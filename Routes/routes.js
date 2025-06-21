/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 /06 /2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (routes.js) define las rutas HTTP para operaciones CRUD en la tabla 'locales'
 * Tema: Rutas - Locales
 *
 * Capa: Backend
 */

import express from 'express'; // Importa la librería Express
const router = express.Router(); // Inicializa el router

import {
  OBRS_Locales_CTS,
  OBR_Local_CTS,
  CR_Local_CTS,
  ER_Local_CTS,
  UR_Local_CTS
} from '../Controllers/Stock/CTS_TB_Locales.js';

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'locales'
// ----------------------------------------------------------------

// Obtener todos los locales
router.get('/locales', OBRS_Locales_CTS);

// Obtener un solo local por ID
router.get('/locales/:id', OBR_Local_CTS);

// Crear un nuevo local
router.post('/locales', CR_Local_CTS);

// Eliminar un local por ID
router.delete('/locales/:id', ER_Local_CTS);

// Actualizar un local por ID
router.put('/locales/:id', UR_Local_CTS);

// ----------------------------------------------------------------
// Exportar controladores usados
// ----------------------------------------------------------------

export default router;

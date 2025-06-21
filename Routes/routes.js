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

// Importar controladores de locales
import {
  OBRS_Locales_CTS,
  OBR_Local_CTS,
  CR_Local_CTS,
  ER_Local_CTS,
  UR_Local_CTS
} from '../Controllers/Stock/CTS_TB_Locales.js';
// Importar controladores de locales

// Importar controladores de productos

import {
  OBRS_Productos_CTS,
  OBR_Producto_CTS,
  CR_Producto_CTS,
  ER_Producto_CTS,
  UR_Producto_CTS
} from '../Controllers/Stock/CTS_TB_Productos.js';
// Importar controladores de productos

// Importar controladores de talles
import {
  OBRS_Talles_CTS,
  OBR_Talle_CTS,
  CR_Talle_CTS,
  ER_Talle_CTS,
  UR_Talle_CTS
} from '../Controllers/Stock/CTS_TB_Talles.js';
// Importar controladores de talles

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
// Rutas para operaciones CRUD en la tabla 'productos'
// ----------------------------------------------------------------

// Obtener todos los productos
router.get('/productos', OBRS_Productos_CTS);

// Obtener un producto por ID
router.get('/productos/:id', OBR_Producto_CTS);

// Crear un nuevo producto
router.post('/productos', CR_Producto_CTS);

// Eliminar un producto
router.delete('/productos/:id', ER_Producto_CTS);

// Actualizar un producto
router.put('/productos/:id', UR_Producto_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'talles'
// ----------------------------------------------------------------

router.get('/talles', OBRS_Talles_CTS);
router.get('/talles/:id', OBR_Talle_CTS);
router.post('/talles', CR_Talle_CTS);
router.delete('/talles/:id', ER_Talle_CTS);
router.put('/talles/:id', UR_Talle_CTS);


export default router;

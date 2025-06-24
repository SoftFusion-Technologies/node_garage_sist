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

// Importar controladores de lugares
import {
  OBRS_Lugares_CTS,
  OBR_Lugar_CTS,
  CR_Lugar_CTS,
  ER_Lugar_CTS,
  UR_Lugar_CTS
} from '../Controllers/Stock/CTS_TB_Lugares.js';
// Importar controladores de lugares

// Importar controladores de estados
import {
  OBRS_Estados_CTS,
  OBR_Estado_CTS,
  CR_Estado_CTS,
  ER_Estado_CTS,
  UR_Estado_CTS
} from '../Controllers/Stock/CTS_TB_Estados.js';
// Importar controladores de estados

// Importar controladores de stock
import {
  OBRS_Stock_CTS,
  OBR_Stock_CTS,
  CR_Stock_CTS,
  ER_Stock_CTS,
  UR_Stock_CTS,
  ER_StockPorProducto
} from '../Controllers/Stock/CTS_TB_Stock.js';

// Importar controladores de usuarios
import {
  OBRS_Usuarios_CTS,
  OBR_Usuario_CTS,
  CR_Usuario_CTS,
  ER_Usuario_CTS,
  UR_Usuario_CTS
} from '../Controllers/CTS_TB_Users.js';
// Importar controladores de usuarios

// Importar controladores de categorias
import {
  OBRS_Categorias_CTS,
  OBR_Categoria_CTS,
  CR_Categoria_CTS,
  ER_Categoria_CTS,
  UR_Categoria_CTS
} from '../Controllers/Stock/CTS_TB_Categorias.js';
// Importar controladores de categorias

import importRouter from './importRouter.js'; // 🆕 CARGA MASIVA

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

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'Lugares'
// ----------------------------------------------------------------

router.get('/lugares', OBRS_Lugares_CTS);
router.get('/lugares/:id', OBR_Lugar_CTS);
router.post('/lugares', CR_Lugar_CTS);
router.delete('/lugares/:id', ER_Lugar_CTS);
router.put('/lugares/:id', UR_Lugar_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'Estados'
// ----------------------------------------------------------------

router.get('/estados', OBRS_Estados_CTS);
router.get('/estados/:id', OBR_Estado_CTS);
router.post('/estados', CR_Estado_CTS);
router.delete('/estados/:id', ER_Estado_CTS);
router.put('/estados/:id', UR_Estado_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'Stock'
// ----------------------------------------------------------------

router.get('/stock', OBRS_Stock_CTS);
router.get('/stock/:id', OBR_Stock_CTS);
router.post('/stock', CR_Stock_CTS);
router.delete('/stock/:id', ER_Stock_CTS);
router.put('/stock/:id', UR_Stock_CTS);
router.delete('/stock/producto/:id', ER_StockPorProducto);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'usuarios'
// ----------------------------------------------------------------

router.get('/usuarios', OBRS_Usuarios_CTS);
router.get('/usuarios/:id', OBR_Usuario_CTS);
router.post('/usuarios', CR_Usuario_CTS);
router.delete('/usuarios/:id', ER_Usuario_CTS);
router.put('/usuarios/:id', UR_Usuario_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'categorias'
// ----------------------------------------------------------------

router.get('/categorias', OBRS_Categorias_CTS);
router.get('/categorias/:id', OBR_Categoria_CTS);
router.post('/categorias', CR_Categoria_CTS);
router.delete('/categorias/:id', ER_Categoria_CTS);
router.put('/categorias/:id', UR_Categoria_CTS);

// Rutas de carga masiva
router.use('/carga-masiva', importRouter); // 🆕  (=> POST /api/import/:tabla)
export default router;

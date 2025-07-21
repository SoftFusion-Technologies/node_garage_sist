// Calcular el total con ajuste y cuotas
import { MediosPagoCuotasModel } from '../../Models/Ventas/MD_TB_MediosPagoCuotas.js';
import { MediosPagoModel } from '../../Models/Ventas/MD_TB_MediosPago.js';

export const CALC_TotalFinal_CTS = async (req, res) => {
  const { precio_base, medio_pago_id, cuotas, descuento_personalizado } =
    req.body;

  if (!precio_base || !medio_pago_id) {
    return res.status(400).json({ mensajeError: 'Faltan datos obligatorios' });
  }

  try {
    const medio = await MediosPagoModel.findByPk(medio_pago_id);

    if (!medio) {
      return res
        .status(404)
        .json({ mensajeError: 'Medio de pago no encontrado' });
    }

    // 1. Aplicar descuento personalizado si viene, sino usar el ajuste normal (si es negativo)
    let total = precio_base;
    let ajuste_porcentual = medio.ajuste_porcentual || 0;

    let descuentoReal = 0;
    if (
      descuento_personalizado !== undefined &&
      descuento_personalizado !== null &&
      !isNaN(Number(descuento_personalizado)) &&
      Number(descuento_personalizado) > 0
    ) {
      // Aplica el descuento personalizado
      descuentoReal = Number(descuento_personalizado);
      total = total * (1 - descuentoReal / 100);
      ajuste_porcentual = -descuentoReal; // Usar signo negativo para mantener compatibilidad visual
    } else if (ajuste_porcentual < 0) {
      // Si el método de pago ya tiene descuento (caso legacy)
      total = total * (1 + ajuste_porcentual / 100);
      descuentoReal = Math.abs(ajuste_porcentual);
    } else if (ajuste_porcentual > 0) {
      // Si tiene recargo por método de pago
      total = total * (1 + ajuste_porcentual / 100);
    }

    let porcentaje_recargo = 0;

    // 2. Si hay cuotas > 1, buscamos el recargo por cuotas
    if (cuotas && cuotas > 1) {
      const recargo = await MediosPagoCuotasModel.findOne({
        where: {
          medio_pago_id,
          cuotas
        }
      });

      if (recargo) {
        porcentaje_recargo = recargo.porcentaje_recargo;
        total *= 1 + porcentaje_recargo / 100;
      }
    }

    const totalRedondeado = parseFloat(total.toFixed(2));

    let montoPorCuota = null;
    if (cuotas && cuotas > 1) {
      // Redondeamos cada cuota a 2 decimales
      const cuotaRedondeada =
        Math.floor((totalRedondeado / cuotas) * 100) / 100;
      // Recalculamos el total como suma de todas las cuotas
      const totalRecalculado = parseFloat(
        (cuotaRedondeada * cuotas).toFixed(2)
      );
      // Ajustamos la última cuota para no perder valor (si es necesario)
      const diferencia = parseFloat(
        (totalRedondeado - totalRecalculado).toFixed(2)
      );
      // Si hay diferencia (por ej. $0.05), se puede sumar a la última cuota en frontend
      montoPorCuota = cuotaRedondeada;
    }

    res.json({
      precio_base,
      ajuste_porcentual, // ahora puede venir negativo si usaste personalizado
      porcentaje_recargo_cuotas: porcentaje_recargo,
      cuotas: cuotas || 1,
      total: totalRedondeado,
      monto_por_cuota: montoPorCuota,
      diferencia_redondeo:
        cuotas && cuotas > 1
          ? parseFloat((totalRedondeado - montoPorCuota * cuotas).toFixed(2))
          : 0
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};



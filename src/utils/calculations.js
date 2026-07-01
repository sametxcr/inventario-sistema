import { IVA_CHILE } from '../config/app';

/**
 * Calcula neto final y precio de venta con IVA
 * @param {number} netoCompra - Precio de compra sin IVA
 * @param {number} descuentoProv - Descuento proveedor en % (ej: 5 para 5%)
 * @param {number} porcentajeVenta - Multiplicador de venta (ej: 1.4 para 40%)
 * @returns {object} { netoFinal, precioVenta }
 */
export const calcularPrecios = (netoCompra, descuentoProv, porcentajeVenta) => {
  // 1. Aplicar descuento del proveedor
  const netoFinal = netoCompra * (1 - descuentoProv / 100);
  
  // 2. Aplicar margen de venta y luego IVA
  const precioVenta = netoFinal * porcentajeVenta * IVA_CHILE;
  
  return {
    netoFinal: Math.round(netoFinal),
    precioVenta: Math.round(precioVenta)
  };
};

/**
 * Formatea número a pesos chilenos
 * @param {number} precio 
 * @returns {string} $1.234.567
 */
export const formatearPrecio = (precio) => {
  if (isNaN(precio)) return '$0';
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(precio);
};

/**
 * Calcula stock total de un producto
 * @param {object} producto 
 * @returns {number} stock total
 */
export const calcularStockTotal = (producto) => {
  return (producto.stock_local || 0) + (producto.stock_bodega || 0);
};

/**
 * Verifica si un producto tiene stock bajo
 * @param {object} producto 
 * @returns {boolean} true si está bajo el mínimo
 */
export const esStockBajo = (producto) => {
  const total = calcularStockTotal(producto);
  return total < (producto.stock_minimo || 0);
};

/**
 * Calcula el valor total del inventario
 * @param {array} productos 
 * @returns {number} valor total en pesos
 */
export const calcularValorInventario = (productos) => {
  return productos.reduce((sum, p) => {
    const stock = calcularStockTotal(p);
    return sum + (p.precio_venta * stock);
  }, 0);
};

/**
 * Calcula totales de una OT: neto, iva, total
 * @param {object} ot - Objeto de orden de trabajo
 * @returns {object} { neto, iva, total }
 */
export const calcularTotales = (ot) => {
  const totalRepuestos = (ot.repuestos_usados || []).reduce((sum, rep) => 
    sum + (rep.precio_venta * rep.cantidad), 0
  );
  
  const totalManoObra = (ot.mano_obra || []).reduce((sum, mo) => 
    sum + (mo.valor_unit * mo.cantidad), 0
  );
  
  const subtotal = totalRepuestos + totalManoObra;
  const neto = Math.round(subtotal / 1.19);
  const iva = subtotal - neto;
  
  return { neto, iva, total: subtotal };
};
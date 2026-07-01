import Dexie from 'dexie';

export const db = new Dexie('TallerDB');

// Versión 1: Productos base + historial precios
db.version(1).stores({
  productos: '++id, sku, nombre, familia, stock_local, stock_bodega, stock_minimo, neto_compra, descuento_prov, porcentaje_venta, neto_final, precio_venta, actualizado',
  historial_precios: '++id, sku, precio_anterior, precio_nuevo, fecha'
});

// Versión 2: Agregamos clientes
db.version(2).stores({
  productos: '++id, sku, nombre, familia, stock_local, stock_bodega, stock_minimo, neto_compra, descuento_prov, porcentaje_venta, neto_final, precio_venta, actualizado',
  historial_precios: '++id, sku, precio_anterior, precio_nuevo, fecha',
  clientes: '++id, nombre, rut, celular, fecha_recepcion, marca, modelo, patente, estado, creado, actualizado'
}).upgrade(tx => {
  console.log('Migrando a v2: agregando tabla clientes');
});

// Versión 3: Agregamos ordenes_trabajo básica
db.version(3).stores({
  productos: '++id, sku, nombre, familia, stock_local, stock_bodega, stock_minimo, neto_compra, descuento_prov, porcentaje_venta, neto_final, precio_venta, actualizado',
  historial_precios: '++id, sku, precio_anterior, precio_nuevo, fecha',
  clientes: '++id, nombre, rut, celular, fecha_recepcion, marca, modelo, patente, estado, creado, actualizado',
  ordenes_trabajo: '++id, patente, rut_cliente, fecha_creacion, servicios, descripcion_servicio, estado_ot, monto_estimado, monto_final, creado, actualizado'
}).upgrade(tx => {
  console.log('Migrando a v3: agregando tabla ordenes_trabajo');
});

// Versión 4: Agregamos kilometraje, técnico, checklist y repuestos a OTs
db.version(4).stores({
  productos: '++id, sku, nombre, familia, stock_local, stock_bodega, stock_minimo, neto_compra, descuento_prov, porcentaje_venta, neto_final, precio_venta, actualizado',
  historial_precios: '++id, sku, precio_anterior, precio_nuevo, fecha',
  clientes: '++id, nombre, rut, celular, fecha_recepcion, marca, modelo, patente, estado, creado, actualizado',
  ordenes_trabajo: '++id, patente, rut_cliente, fecha_creacion, servicios, descripcion_servicio, estado_ot, monto_estimado, monto_final, kilometraje, tecnico_asignado, checklist_recepcion, repuestos_usados, creado, actualizado'
}).upgrade(tx => {
  console.log('Migrando a v4: agregando kilometraje, tecnico_asignado, checklist_recepcion, repuestos_usados a ordenes_trabajo');
});

// Versión 5: Agregamos campos extras para futuras mejoras
db.version(5).stores({
  productos: '++id, sku, nombre, familia, stock_local, stock_bodega, stock_minimo, neto_compra, descuento_prov, porcentaje_venta, neto_final, precio_venta, actualizado, codigo_barra, ubicacion_bodega',
  historial_precios: '++id, sku, precio_anterior, precio_nuevo, fecha, motivo_cambio',
  clientes: '++id, nombre, rut, celular, email, direccion, fecha_recepcion, marca, modelo, patente, año, vin, estado, creado, actualizado',
  ordenes_trabajo: '++id, patente, rut_cliente, fecha_creacion, fecha_entrega, servicios, descripcion_servicio, estado_ot, monto_estimado, monto_final, abono, kilometraje, tecnico_asignado, checklist_recepcion, repuestos_usados, horas_trabajadas, observaciones_internas, creado, actualizado'
}).upgrade(async tx => {
  console.log('Migrando a v5: agregando campos extras para trazabilidad completa');

  // Migrar checklist antiguo de array de strings a array de objetos
  await tx.table('ordenes_trabajo').toCollection().modify(ot => {
    if (ot.checklist_recepcion && Array.isArray(ot.checklist_recepcion)) {
      // Si es array de strings, convertir a objetos
      if (typeof ot.checklist_recepcion[0] === 'string') {
        ot.checklist_recepcion = ot.checklist_recepcion.map(item => ({
          item: item,
          estado: true,
          obs: ''
        }));
      }
    }
  });
});

// Versión 6: Agregamos tabla cotizaciones
db.version(6).stores({
  productos: '++id, sku, nombre, familia, stock_local, stock_bodega, stock_minimo, neto_compra, descuento_prov, porcentaje_venta, neto_final, precio_venta, actualizado, codigo_barra, ubicacion_bodega',
  historial_precios: '++id, sku, precio_anterior, precio_nuevo, fecha, motivo_cambio',
  clientes: '++id, nombre, rut, celular, email, direccion, fecha_recepcion, marca, modelo, patente, año, vin, estado, creado, actualizado',
  ordenes_trabajo: '++id, patente, rut_cliente, fecha_creacion, fecha_entrega, servicios, descripcion_servicio, estado_ot, monto_estimado, monto_final, abono, kilometraje, tecnico_asignado, checklist_recepcion, repuestos_usados, horas_trabajadas, observaciones_internas, creado, actualizado',
  cotizaciones: '++id, numero, fecha, cliente, patente, productos, servicios, descuentoGlobal, validezDias, observaciones, vendedor, total, estado'
}).upgrade(tx => {
  console.log('Migrando a v6: agregando tabla cotizaciones');
});
import * as XLSX from 'xlsx';
import { db } from '../db/database';
import { calcularPrecios } from './calculations';

export const importarDesdeExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        let importados = 0;
        const errores = [];
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          try {
            // Mapeo flexible de columnas del Excel
            const sku = (row.SKU || row.sku || row.Sku || '').toString().trim().toUpperCase();
            const nombre = (row.NOMBRE || row.nombre || row.Nombre || row.DESCRIPCION || '').toString().trim();
            const familia = (row.FAMILIA || row.familia || row.Familia || 'OTROS').toString().trim().toUpperCase();
            const stock_local = parseInt(row['STOCK LOCAL'] || row.stock_local || row['Stock Local'] || 0);
            const stock_bodega = parseInt(row['STOCK BODEGA'] || row.stock_bodega || row['Stock Bodega'] || 0);
            const stock_minimo = parseInt(row['STOCK MINIMO'] || row.stock_minimo || row['Stock Minimo'] || 10);
            const neto_compra = parseFloat(row['NETO COMPRA'] || row.neto_compra || row['Neto Compra'] || 0);
            
            // FIX: Leer DCTO PROV manejando 54% o 0.54 o 54
            let descuento_prov_raw = 
              row['DCTO PROV'] || 
              row['DCTO_PROV'] || 
              row.dcto_prov || 
              row['DESCUENTO PROV'] || 
              row.descuento_prov || 
              row['Descuento Prov'] || 
              0;
            
            // Si viene como string "54%" lo limpia
            if (typeof descuento_prov_raw === 'string') {
              descuento_prov_raw = descuento_prov_raw.replace('%', '').trim();
            }
            
            let descuento_prov = parseFloat(descuento_prov_raw) || 0;
            
            // Si Excel guardó 54% como 0.54, lo convertimos a 54
            if (descuento_prov > 0 && descuento_prov < 1) {
              descuento_prov = Math.round(descuento_prov * 100);
            }
            
            // Asegurar entero entre 0 y 100
            descuento_prov = Math.round(descuento_prov);
            
            const porcentaje_venta = parseFloat(row['% VENTA'] || row.porcentaje_venta || row['Porcentaje Venta'] || 1.4);
            
            if (!sku ||!nombre) {
              errores.push(`Fila ${i + 2}: Falta SKU o Nombre`);
              continue;
            }
            
            // Calcular precios con el descuento correcto
            const { netoFinal, precioVenta } = calcularPrecios(neto_compra, descuento_prov, porcentaje_venta);
            
            const producto = {
              sku,
              nombre,
              familia,
              stock_local,
              stock_bodega,
              stock_minimo,
              neto_compra,
              descuento_prov,
              porcentaje_venta,
              neto_final: netoFinal,
              precio_venta: precioVenta,
              actualizado: new Date().toISOString()
            };
            
            // Si existe, actualizar. Si no, crear
            const existe = await db.productos.where('sku').equals(sku).first();
            
            if (existe) {
              await db.productos.update(existe.id, producto);
              
              // Guardar historial si cambió el precio
              if (existe.precio_venta!== precioVenta) {
                await db.historial_precios.add({
                  sku,
                  precio_anterior: existe.precio_venta,
                  precio_nuevo: precioVenta,
                  fecha: new Date().toISOString()
                });
              }
            } else {
              await db.productos.add(producto);
            }
            
            importados++;
          } catch (err) {
            errores.push(`Fila ${i + 2}: ${err.message}`);
          }
        }
        
        resolve({ importados, errores });
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};
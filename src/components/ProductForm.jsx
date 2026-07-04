import { useState, useEffect, useRef } from 'react';
import { api, API_URL } from '../api'; 
import { calcularPrecios, formatearPrecio } from '../utils/calculations';
import { PORCENTAJES_VENTA, CONFIG, FAMILIAS_DEFAULT } from '../config/app';


export default function ProductForm({ productoEditando, modo, onGuardar, onLimpiar, onFamiliasChange, onEditarProducto, setMensaje }) {

  const [form, setForm] = useState({
    sku: '',
    nombre: '',
    familia: 'OTROS',
    stock_local: 0,
    stock_bodega: 0,
    stock_minimo: CONFIG.STOCK_MINIMO_DEFAULT,
    neto_compra: 0,
    descuento_prov_porcentaje: 0,
    porcentaje_venta: CONFIG.PORCENTAJE_VENTA_DEFAULT,
    motivo: '',
	imagen_url: ''
  });

  const [precios, setPrecios] = useState({ netoFinal: 0, precioVenta: 0 });
  const [editandoNeto, setEditandoNeto] = useState(false);
  const [familiasDB, setFamiliasDB] = useState(FAMILIAS_DEFAULT);
  const [previewImg, setPreviewImg] = useState(null);
  const [formInicial, setFormInicial] = useState(null);
  const [hayCambios, setHayCambios] = useState(false);
  const fileInputRef = useRef(null);
  const [archivoFoto, setArchivoFoto] = useState(null);
  
  

  const cargarFamilias = async () => {
    const productos = await api.get('productos');
    const familiasUnicas = [...new Set(productos.map(p => p.familia))].filter(Boolean).sort();
    setFamiliasDB(familiasUnicas.length > 0? familiasUnicas : FAMILIAS_DEFAULT);
  };

  useEffect(() => {
    cargarFamilias();
  }, []);

// ANTES - NO GUARDA imagen_url EN EL FORM
useEffect(() => {
  if (productoEditando) {
    let porcentajeLimpio = parseFloat(productoEditando.porcentaje_venta);
    if (porcentajeLimpio > 5) {
      porcentajeLimpio = 1 + (porcentajeLimpio / 100);
    }

    setForm({
      sku: productoEditando.sku,
      nombre: productoEditando.nombre,
      familia: productoEditando.familia,
      stock_local: productoEditando.stock_local,
      stock_bodega: productoEditando.stock_bodega,
      stock_minimo: productoEditando.stock_minimo,
      neto_compra: productoEditando.neto_compra,
      descuento_prov_porcentaje: productoEditando.descuento_prov_porcentaje || 0,
      porcentaje_venta: porcentajeLimpio,
      motivo: '',
      imagen_url: productoEditando.imagen_url || '' // ← FALTABA ESTA LÍNEA
    });
    setPreviewImg(
  productoEditando.imagen_url 
   ? `${API_URL.replace('/api', '')}${productoEditando.imagen_url}` 
    : null
);
  } else {
    limpiarForm();
  }
}, [productoEditando]);

  useEffect(() => {
    const { netoFinal, precioVenta } = calcularPrecios(
      parseFloat(form.neto_compra) || 0,
      parseFloat(form.descuento_prov_porcentaje) || 0,
      parseFloat(form.porcentaje_venta) || 0 // ← Cambiado de 1 a 0
    );
    setPrecios({ netoFinal, precioVenta });
  }, [form.neto_compra, form.descuento_prov_porcentaje, form.porcentaje_venta]);

const limpiarForm = () => {
  setForm({
    sku: '',
    nombre: '',
    familia: familiasDB[0] || 'OTROS',
    stock_local: 0,
    stock_bodega: 0,
    stock_minimo: CONFIG.STOCK_MINIMO_DEFAULT,
    neto_compra: 0,
    descuento_prov_porcentaje: 0,
    porcentaje_venta: CONFIG.PORCENTAJE_VENTA_DEFAULT,
    motivo: '',
    imagen_url: ''
  });
  setPreviewImg(null);
  setArchivoFoto(null);
  if (fileInputRef.current) fileInputRef.current.value = '';
  setEditandoNeto(false);
  onLimpiar();
};
const handleImagenChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    setArchivoFoto(file); // ← Guarda el archivo real
    setPreviewImg(URL.createObjectURL(file)); // ← Preview sin base64
  }
};

const handleQuitarFoto = async () => {
  if (productoEditando?.sku && productoEditando?.imagen_url) {
    try {
      const skuUpper = productoEditando.sku.toUpperCase();
      await api.delete(`productos/${skuUpper}/foto`); // ← SIN / al inicio
    } catch (err) {
      console.error('Error borrando foto:', err);
      setMensaje('No se pudo borrar la foto del servidor', 'error');
      return;
    }
  }
  
  setArchivoFoto(null);
  setPreviewImg(null);
  setForm({...form, imagen_url: ''});
  
  if (fileInputRef.current) fileInputRef.current.value = '';
};

  const handleFamiliaChange = async (e) => {
    const valor = e.target.value;

    if (valor === '__NUEVA__') {
      const nuevaFamilia = window.prompt('Ingresa el nombre de la nueva familia:');
      if (nuevaFamilia && nuevaFamilia.trim()) {
        const familiaUpper = nuevaFamilia.trim().toUpperCase();
        if (!familiasDB.includes(familiaUpper)) {
          const nuevasFamilias = [...familiasDB, familiaUpper].sort();
          setFamiliasDB(nuevasFamilias);
          setForm({...form, familia: familiaUpper});
          onFamiliasChange();
        } else {
          setMensaje('Esa familia ya existe', 'warning');
          e.target.value = form.familia;
        }
      } else {
        e.target.value = form.familia;
      }
      return;
    }

    if (valor === '__ELIMINAR__') {
      const familiaAEliminar = window.prompt('¿Qué familia quieres eliminar?\n\nEscribe el nombre exacto:');
      if (!familiaAEliminar) {
        e.target.value = form.familia;
        return;
      }

      const familiaUpper = familiaAEliminar.trim().toUpperCase();

      if (familiaUpper === 'OTROS') {
        setMensaje('No puedes eliminar "OTROS". Es la familia por defecto', 'warning');
        e.target.value = form.familia;
        return;
      }

      if (!familiasDB.includes(familiaUpper)) {
        setMensaje(`La familia "${familiaUpper}" no existe`, 'warning');
        e.target.value = form.familia;
        return;
      }

      const productosConFamilia = await api.get('productos');
      const productosFamilia = productosConFamilia.filter(p => p.familia === familiaUpper);
      const cantidad = productosFamilia.length;

      const mensaje = cantidad > 0
      ? `⚠ "${familiaUpper}" tiene ${cantidad} producto(s).\n\n` +
          `Al eliminar, quedarán en familia "OTROS" hasta que los edites.\n\n` +
          `¿Continuar?`
        : `¿Seguro que quieres eliminar la familia "${familiaUpper}"?`;

      const confirmar = window.confirm(mensaje);

      if (!confirmar) {
        e.target.value = form.familia;
        return;
      }

      if (cantidad > 0) {
        for (const prod of productosFamilia) {
          await api.put(`productos/${prod.id}`, {...prod, familia: 'OTROS' });
        }
      }

      setFamiliasDB(familiasDB.filter(f => f!== familiaUpper));

      if (form.familia === familiaUpper) {
        setForm({...form, familia: 'OTROS'});
      }

      onFamiliasChange();
      onGuardar();

      setMensaje(`Familia "${familiaUpper}" eliminada${cantidad > 0? `. ${cantidad} productos movidos a "OTROS"` : ''}`, 'success');


      return;
    }

    setForm({...form, familia: valor});
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.sku.trim() || !form.nombre.trim()) {
  setMensaje('SKU y Nombre son obligatorios', 'warning');
  return;
}

  const datosProducto = {
    ...form,
    sku: form.sku.trim().toUpperCase(),
    nombre: form.nombre.trim(),
    familia: form.familia.trim().toUpperCase(),
    stock_local: parseInt(form.stock_local) || 0,
    stock_bodega: parseInt(form.stock_bodega) || 0,
    stock_minimo: parseInt(form.stock_minimo) || 0,
    neto_compra: parseFloat(form.neto_compra) || 0,
    descuento_prov_porcentaje: parseInt(form.descuento_prov_porcentaje) || 0,
    porcentaje_venta: parseFloat(form.porcentaje_venta) || 0,
    imagen_url: form.imagen_url || '', // ← CLAVE: usa el del form
    neto_final: precios.netoFinal,
    precio_venta: precios.precioVenta,
    motivo: productoEditando ? form.motivo.trim() || null : null
  };

  try {
    let skuFinal = datosProducto.sku;
    
    // 1. CREA O ACTUALIZA EL PRODUCTO PRIMERO
    if (productoEditando?.id) {
      await api.put(`productos/${productoEditando.id}`, datosProducto);
    } else {
      const productoCreado = await api.post('productos', datosProducto);
      skuFinal = productoCreado.sku;
    }

    // 2. SI HAY FOTO NUEVA, SÚBELA SIEMPRE - NUEVO O EDITANDO
   if (archivoFoto) {
  const formData = new FormData();
  formData.append('foto', archivoFoto);
  
  const resFoto = await fetch(`${API_URL}/productos/${skuFinal}/foto`, {
    method: 'POST',
    body: formData
  });
  
  if (!resFoto.ok) {
    throw new Error('Error al subir la foto');
  }
  
  const dataFoto = await resFoto.json();
  setForm(prev => ({...prev, imagen_url: dataFoto.foto_url}));
}

    await cargarFamilias();
    onGuardar(!!productoEditando?.id);  // ← Esto debe recargar la lista en el padre
    limpiarForm();
    setArchivoFoto(null);
    //setMensaje('Producto guardado correctamente', 'success'); // ← Cambia este mensaje después
    
  } catch (err) {
    console.error(err);
    setMensaje(err.message || 'Error al guardar el producto', 'error');
  }
};

return (
  <div className="mx-4 mb-2 p-2 bg-gray-800 rounded border border-gray-700">
  <div className="flex justify-between items-center mb-1.5">
    <h2 className="text-base font-bold">
      {modo === 'ver'? 'Ver Producto' : modo === 'editar'? 'Editar Producto' : 'Agregar Producto'}
    </h2>

    {(modo!== 'crear' || form.sku || form.nombre) && (
      <button
        type="button"
        onClick={() => {
          if (modo === 'editar' || productoEditando) {
            if (window.confirm('¿Limpiar formulario?')) {
              limpiarForm();
            }
          } else {
            limpiarForm();
          }
        }}
        className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5"
      >
        <span>🧹</span> Nuevo / Limpiar
      </button>
    )}
  </div>

    <form onSubmit={handleSubmit} className="space-y-1 overflow-hidden">
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-1">
          <div className="grid grid-cols-12 gap-1">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">SKU *</label>
              <input
                type="text"
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={form.sku}
                onChange={e => setForm({...form, sku: e.target.value})}
                disabled={!!productoEditando || modo === 'ver'}
                required
              />
            </div>

            <div className="col-span-8">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">Nombre *</label>
              <input
                type="text"
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                disabled={modo === 'ver'}
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">Familia</label>
              <select
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={form.familia}
                onChange={handleFamiliaChange}
                disabled={modo === 'ver'}
              >
                {familiasDB.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
                {modo !== 'ver' && (
                  <>
                    <option disabled>──────────</option>
                    <option value="__NUEVA__" className="font-bold text-green-600">
                      ➕ Nueva...
                    </option>
                    <option value="__ELIMINAR__" className="font-bold text-red-600">
                      🗑 Eliminar...
                    </option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1">
            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">Stock Local</label>
              <input
                type="number"
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={form.stock_local}
                onChange={e => setForm({...form, stock_local: e.target.value})}
                disabled={modo === 'ver'}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">Stock Bodega</label>
              <input
                type="number"
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={form.stock_bodega}
                onChange={e => setForm({...form, stock_bodega: e.target.value})}
                disabled={modo === 'ver'}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">Stock Mín</label>
              <input
                type="number"
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none border-2 border-red-500/50 disabled:bg-gray-800 disabled:text-gray-400"
                value={form.stock_minimo}
                onChange={e => setForm({...form, stock_minimo: e.target.value})}
                disabled={modo === 'ver'}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">% Venta</label>
              <select
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={form.porcentaje_venta}
                onChange={e => setForm({...form, porcentaje_venta: e.target.value})}
                disabled={modo === 'ver'}
              >
                {PORCENTAJES_VENTA.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1">
            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">Desc. Prov %</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none disabled:bg-gray-800 disabled:text-gray-400"
                value={Math.round(form.descuento_prov_porcentaje)}
                onChange={e => setForm({...form, descuento_prov_porcentaje: parseInt(e.target.value) || 0})}
                disabled={modo === 'ver'}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">NETO COMPRA</label>
              {editandoNeto && modo !== 'ver' ? (
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm ring-2 ring-orange-500 outline-none"
                  value={form.neto_compra}
                  onChange={e => setForm({...form, neto_compra: e.target.value})}
                  onBlur={() => setEditandoNeto(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditandoNeto(false)}
                  autoFocus
                />
              ) : (
                <div
                  className={`w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm font-bold text-orange-400 ${modo !== 'ver' ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''}`}
                  onDoubleClick={() => modo !== 'ver' && setEditandoNeto(true)}
                  title={modo !== 'ver' ? "Doble click para editar" : ""}
                >
                  {formatearPrecio(form.neto_compra)}
                </div>
              )}
            </div>

            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">NETO FINAL</label>
              <div className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm font-bold text-cyan-400">
                {formatearPrecio(precios.netoFinal)}
              </div>
            </div>

            <div className="col-span-3">
              <label className="block text-xs text-gray-400 leading-none mb-0.5">PRECIO VENTA</label>
              <div className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm font-bold text-yellow-400">
                {formatearPrecio(precios.precioVenta)}
              </div>
            </div>
          </div>

          {modo === 'ver' ? (
            // MODO VER: Solo cerrar y botón para editar
            <div className="flex justify-end gap-2">
              
            </div>
          ) : (
            // MODO CREAR O EDITAR
            <>
              {modo === 'editar' && (
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <label className="block text-gray-400 text-xs leading-none mb-0.5">Motivo del cambio</label>
                    <input
                      type="text"
                      placeholder="Alza proveedor, Oferta..."
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                      value={form.motivo}
                      onChange={e => setForm({...form, motivo: e.target.value})}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-green-600 rounded font-bold text-sm hover:bg-green-700 whitespace-nowrap"
                  >
                    💾 Actualizar
                  </button>
                  <button
                    type="button"
                    onClick={limpiarForm}
                    className="px-3 py-1 bg-gray-600 rounded font-bold text-sm hover:bg-gray-700"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              )}
              {modo === 'crear' && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1 bg-green-600 rounded font-bold text-sm hover:bg-green-700"
                  >
                    ➕ Agregar Producto
                  </button>
                </div>
              )}
            </>
          )}
        </div>

       <div className="w-48 flex-shrink-0">
  <label className="text-xs text-gray-400 block leading-none mb-0.5">Foto Producto</label>
  
  {/* Input pa CÁMARA */}
  <input
    ref={useRef(null)}
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleImagenChange}
    className="hidden"
    id="foto-camara"
    disabled={modo === 'ver'}
  />
  
  {/* Input pa GALERÍA */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleImagenChange}
    className="hidden"
    id="foto-galeria"
    disabled={modo === 'ver'}
  />

  {previewImg? (
    <div className="relative">
      <img src={previewImg} alt="Preview" className="w-48 h-36 object-cover rounded border border-gray-600" />
      <button
        type="button"
        onClick={handleQuitarFoto}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
      >
        ✕
      </button>
    </div>
  ) : (
    <div className="w-48 h-36 border-2 border-dashed border-gray-600 rounded flex flex-col gap-1 p-2">
      {modo !== 'ver' && (
        <>
          <label
            htmlFor="foto-camara"
            className="flex-1 bg-gray-700 hover:bg-cyan-600 rounded flex items-center justify-center cursor-pointer transition-colors text-xs"
          >
            📷 Sacar foto
          </label>
          <label
            htmlFor="foto-galeria"
            className="flex-1 bg-gray-700 hover:bg-blue-600 rounded flex items-center justify-center cursor-pointer transition-colors text-xs"
          >
            🖼️ Galería
          </label>
        </>
      )}
      {modo === 'ver' && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
          <div className="text-center">
            <div className="text-3xl mb-1">📷</div>
            <div>Sin foto</div>
          </div>
        </div>
      )}
    </div>
  )}
  
  {modo !== 'ver' && previewImg && (
    <button
      type="button"
      onClick={handleQuitarFoto}
      className="w-full mt-0.5 text-xs text-red-400 hover:text-red-300"
    >
      Quitar foto
    </button>
  )}
</div>

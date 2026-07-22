import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { formatearPrecio } from '../utils/calculations';
import { useRefresh } from './RefreshContext';
import { abrirOTEnNuevaVentana } from '../utils/imprimirOT';

export default function RetirosTab({ setMensaje, productos, onRetiroGuardado }) {
  console.log('PRODUCTOS EN RETIROS:', productos);
  const [retiros, setRetiros] = useState([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [repuestosOTSeleccionada, setRepuestosOTSeleccionada] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const dropdownRef = useRef(null);
  const enviandoRef = useRef(false); // ← ESTA LÍNEA FALTA
  const { triggerRefresh } = useRefresh();

  const [form, setForm] = useState({
    producto_id: '',
    cantidad: 1,
    motivo: 'uso interno',
    tipo_retiro: 'consumo_interno',
    responsable: '',
    bodega: 'local',
    ot_id: null
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current &&!dropdownRef.current.contains(e.target)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarDatos = async () => {
    try {
      const [retirosData, otsData] = await Promise.all([
        api.get('retiros'),
        api.get('ordenes_trabajo?para_retiro=true')
      ]);
      setRetiros(retirosData);
      
      const otsActivas = otsData.filter(ot => 
        ot.estado_ot !== 'Entregado' && 
        ot.estado_ot !== 'Finalizado'
      );
      setOrdenesTrabajo(otsActivas);
      
    } catch (err) {
      console.error('Error cargarDatos:', err);
      setMensaje('Error al cargar datos', 'error');
    }
  };

  const handleSeleccionarOT = async (ot) => {
    setForm({...form, ot_id: ot.id});
    setRepuestosOTSeleccionada([]);

    try {
      const data = await api.get(`ordenes_trabajo/${ot.id}`);
      const repuestos = data.repuestos_usados || [];
      setRepuestosOTSeleccionada(repuestos);

      if (repuestos.length > 0) {
        setMensaje(`OT-${ot.numero || ot.id} tiene ${repuestos.length} repuestos`, 'info');
      } else {
        setMensaje('Esta OT no tiene repuestos asignados', 'warning');
      }
    } catch (err) {
      console.error('Error:', err);
      setMensaje('Error cargando repuestos de la OT', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ GUARD ANTI DOBLE CLICK - USA enviandoRef NO cargando
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    if (!form.producto_id || !productoSeleccionado) {
      setMensaje('Selecciona un producto', 'error');
      enviandoRef.current = false;
      return;
    }
    if (!form.motivo.trim()) {
      setMensaje('Ingresa el motivo del retiro', 'error');
      enviandoRef.current = false;
      return;
    }

    const prod = productoSeleccionado;

    const stockDisponible = form.bodega === 'bodega'? prod.stock_bodega : prod.stock_local;
    if (parseInt(form.cantidad) > stockDisponible) {
      setMensaje(`❌ Stock insuficiente. Disponible: ${stockDisponible}`, 'error');
      enviandoRef.current = false;
      return;
    }

    if (parseInt(form.cantidad) <= 0) {
      setMensaje('La cantidad debe ser mayor a 0', 'error');
      enviandoRef.current = false;
      return;
    }

    setCargando(true);
    let retiroResponse = null;
    
    try {
      retiroResponse = await api.post('retiros', {
        producto_id: parseInt(form.producto_id),
        cantidad: parseInt(form.cantidad),
        motivo: form.motivo.trim(),
        tipo_retiro: form.tipo_retiro,
        responsable: form.responsable.trim(),
        bodega: form.bodega,
        sku: prod.sku,
        nombre_producto: prod.nombre,
        precio_venta: parseInt(prod.precio_venta || prod.neto_venta || 0),
        ot_id: form.ot_id || null
      });

      // ✅ OPTIMISTIC UPDATE - Aparece altiro
      const nuevoRetiro = {
        ...retiroResponse,
        creado: new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(' ', 'T') + '-04:00',
        nombre_producto: prod.nombre,
        sku: prod.sku,
        cantidad: parseInt(form.cantidad),
        bodega: form.bodega,
        tipo_retiro: form.tipo_retiro,
        motivo: form.motivo,
        responsable: form.responsable,
        ot_id: form.ot_id,
        ot_numero: ordenesTrabajo.find(o => o.id === form.ot_id)?.numero || null,
        precio_venta: parseInt(prod.precio_venta || prod.neto_venta || 0)
      };
      setRetiros(prev => [nuevoRetiro, ...prev]);

     if (form.ot_id) {
  try {
    await api.post(`ordenes_trabajo/${form.ot_id}/agregar-repuesto-desde-retiro`, {
      sku: prod.sku,
      descripcion: prod.nombre,
      cantidad: parseInt(form.cantidad),
      valor_unitario: parseInt(prod.precio_venta || prod.neto_venta || 0),
      retiro_id: parseInt(retiroResponse.id)
    });
    
    // ✅ UNA SOLA VEZ
    const otActualizada = await api.get(`ordenes_trabajo/${form.ot_id}`);
    if (onRetiroGuardado) onRetiroGuardado(otActualizada);
    
  } catch (err) {
    // ✅ IGNORA EL 409 - NO REVIENTA
    if (!err.message.includes('409') && !err.message.includes('ya fue agregado')) {
      throw err;
    }
    console.log('409 ignorado - retiro ya estaba en OT');
    
    // ✅ AUNQUE TIRE 409, IGUAL RECARGA LA OT
    const otActualizada = await api.get(`ordenes_trabajo/${form.ot_id}`);
    if (onRetiroGuardado) onRetiroGuardado(otActualizada);
  }
}

setMensaje('✅ Retiro registrado', 'success');
      
      // ✅ Reset form
      setForm({
        producto_id: '',
        cantidad: 1,
        motivo: 'uso interno',
        tipo_retiro: 'consumo_interno',
        responsable: '',
        bodega: 'local',
        ot_id: null
      });
      setProductoSeleccionado(null);
      setBusqueda('');
      setRepuestosOTSeleccionada([]);

      // ✅ Refresca en background
      cargarDatos();
      triggerRefresh();

    } catch (err) {
      console.error('Error:', err);
      
      // ✅ ROLLBACK si falla
      if (retiroResponse?.id) {
        setRetiros(prev => prev.filter(r => r.id !== retiroResponse.id));
      }
      
      setMensaje('Error: ' + err.message, 'error');
    } finally {
      setCargando(false);
      enviandoRef.current = false; // ← DESBLOQUEA
    }
  };

const eliminarRetiro = async (id, ot_id, sku) => {
  if (!window.confirm('¿Eliminar retiro? Se devolverá el stock automáticamente')) return;

  setCargando(true);
  try {
    // 1. Elimina el retiro de la BD
    const response = await api.delete(`retiros/${id}`);

    // 2. Si el retiro estaba asociado a una OT, quita el repuesto de la OT
    if (ot_id && sku) {
      try {
        await api.post(`ordenes_trabajo/${ot_id}/quitar-repuesto-desde-retiro`, {
          sku: sku,
          retiro_id: id
        });

        // 3. Trae la OT actualizada
        const otActualizada = await api.get(`ordenes_trabajo/${ot_id}`);

        // 4. Le avisa al padre que recargue la ficha ← IGUAL QUE AL REGISTRAR
        if (onRetiroGuardado) onRetiroGuardado(otActualizada);

      } catch (err) {
        console.error('Error actualizando OT:', err);
        // No revienta, igual borra el retiro
      }
    }

    setMensaje('✅ Retiro eliminado y stock devuelto', 'success');
    await cargarDatos();
    triggerRefresh();

  } catch (err) {
    console.error('Error al eliminar:', err);
    setMensaje('Error al eliminar: ' + err.message, 'error');
  } finally {
    setCargando(false);
  }
};
  

  const imprimirComprobante = (retiro) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprobante Retiro #${retiro.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .box { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .label { color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; font-weight: bold; margin-top: 5px; }
        .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
        .firma { margin-top: 60px; border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>📦 COMPROBANTE DE RETIRO</h1>
        <div class="header">
          <div><strong>Retiro #${retiro.id}</strong></div>
          <div>${new Date(retiro.creado).toLocaleString('es-CL')}</div>
        </div>

        <div class="box">
          <div class="label">Producto</div>
          <div class="value">${retiro.sku} - ${retiro.nombre_producto}</div>
        </div>

        <div class="box">
          <div class="label">Cantidad</div>
          <div class="value">${retiro.cantidad} unidades</div>
        </div>

        <div class="box">
          <div class="label">Bodega</div>
          <div class="value">${retiro.bodega === 'bodega'? 'Bodega' : 'Local'}</div>
        </div>

        ${retiro.ot_id? `
        <div class="box">
          <div class="label">OT Asociada</div>
          <div class="value">OT-${retiro.ot_numero || retiro.ot_id}</div>
        </div>
        ` : ''}

        <div class="box">
          <div class="label">Motivo</div>
          <div class="value">${retiro.motivo}</div>
        </div>

        <div class="box">
          <div class="label">Responsable</div>
          <div class="value">${retiro.responsable || 'Sistema'}</div>
        </div>

        <div class="box">
          <div class="label">Costo Total</div>
          <div class="value" style="color: #f97316; font-size: 20px;">${formatearPrecio((r.precio_venta || r.costo_unitario) * r.cantidad)}</div>
        </div>

        <div class="footer">
          <div class="firma">Firma Responsable</div>
        </div>

        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir</button>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const productosFiltrados = productos.filter(p =>
    p.sku?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  ).slice(0, 10);

  //const productoSeleccionado = productos.find(p => p.id === parseInt(form.producto_id));
  const stockDisponible = form.bodega === 'bodega'
 ? productoSeleccionado?.stock_bodega || 0
    : productoSeleccionado?.stock_local || 0;

  const getTipoColor = (tipo) => {
    const colores = {
      'consumo_interno': 'bg-blue-600/20 text-blue-400 border-blue-500/30',
      'perdida': 'bg-red-600/20 text-red-400 border-red-500/30',
      'ajuste': 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
      'prestamo': 'bg-purple-600/20 text-purple-400 border-purple-500/30',
      'otro': 'bg-gray-600/20 text-gray-400 border-gray-500/30'
    };
    return colores[tipo] || 'bg-gray-600/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="p-4 space-y-3">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-lg">📦</div>
          <div>
            <h2 className="text-base font-bold text-orange-400">Nuevo Retiro de Inventario</h2>
            <p className="text-xs text-gray-500">Descuenta stock automáticamente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-4 relative" ref={dropdownRef}>
              <label className="text-xs text-gray-400 block mb-1">Producto *</label>
              <input
                type="text"
                placeholder="Buscar SKU o nombre..."
                value={productoSeleccionado? `${productoSeleccionado.sku} - ${productoSeleccionado.nombre}` : busqueda}
                onChange={e => {
                  setBusqueda(e.target.value);
                  setForm({...form, producto_id: ''});
				  setProductoSeleccionado(null);
                  setMostrarDropdown(true);
                }}
                onFocus={() => setMostrarDropdown(true)}
				readOnly={!!productoSeleccionado}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 outline-none"
              />

              {mostrarDropdown && busqueda &&!form.producto_id && (
                <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded shadow-2xl max-h-60 overflow-y-auto">
                  {productosFiltrados.length > 0? productosFiltrados.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setForm({...form, producto_id: p.id});
						setProductoSeleccionado(p); // ← AGREGA ESTA LÍNEA
			            setBusqueda(''); // ← ESTA LÍNEA YA ESTÁ, DÉJALA
                        setBusqueda('');
                        setMostrarDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm border-b border-gray-600 last:border-0"
                    >
                      <div className="font-bold text-white">{p.sku}</div>
                      <div className="text-xs text-gray-400">{p.nombre}</div>
                      <div className="text-xs text-cyan-400">L:{p.stock_local} B:{p.stock_bodega} | {formatearPrecio(p.precio_venta)}</div>
                    </button>
                  )) : (
                    <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                  )}
                </div>
              )}

              {productoSeleccionado && (
                <div className={`text-xs mt-1 flex items-center justify-between px-2 py-1 rounded ${
                  stockDisponible === 0
                 ? 'bg-red-500/10 text-red-400'
                    : stockDisponible < 5
                 ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-cyan-500/10 text-cyan-400'
                }`}>
                  <span>Stock {form.bodega}: <span className="font-bold">{stockDisponible}</span> {stockDisponible === 0 && '⚠ SIN STOCK'}</span>
                  <button
  type="button"
  onClick={() => {
    setForm({...form, producto_id: ''});
    setProductoSeleccionado(null); // ← AGREGA ESTA LÍNEA
    setBusqueda('');
  }}
  className="text-red-400 hover:text-red-300"
>
  ✕ Cambiar
</button>
                </div>
              )}
            </div>

            <div className="col-span-4 md:col-span-1">
              <label className="text-xs text-gray-400 block mb-1">Cant *</label>
              <input
                type="number"
                min="1"
                max={stockDisponible}
                value={form.cantidad}
                onChange={e => setForm({...form, cantidad: e.target.value})}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 outline-none"
                required
              />
            </div>

            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Bodega *</label>
              <select
                value={form.bodega}
                onChange={e => setForm({...form, bodega: e.target.value})}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 outline-none"
              >
                <option value="local">Local ({productoSeleccionado?.stock_local || 0})</option>
                <option value="bodega">Bodega ({productoSeleccionado?.stock_bodega || 0})</option>
              </select>
            </div>

            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Tipo *</label>
              <select
                value={form.tipo_retiro}
                onChange={e => setForm({...form, tipo_retiro: e.target.value})}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 outline-none"
              >
                <option value="consumo_interno">Consumo Interno</option>
                <option value="perdida">Pérdida/Daño</option>
                <option value="ajuste">Ajuste Inventario</option>
                <option value="prestamo">Préstamo</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="col-span-6 md:col-span-3">
              <label className="text-xs text-gray-400 block mb-1">Responsable</label>
              <input
                type="text"
                placeholder="Quién retira..."
                value={form.responsable}
                onChange={e => setForm({...form, responsable: e.target.value})}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 outline-none"
				required
              />
            </div>

            <div className="col-span-12 md:col-span-9">
              <label className="text-xs text-gray-400 block mb-1">Asociar a OT Activa</label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto bg-gray-700/50 border border-gray-600 rounded p-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm({...form, ot_id: null});
                    setRepuestosOTSeleccionada([]);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                 !form.ot_id
                   ? 'bg-orange-600 text-white border-2 border-orange-400'
                      : 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500'
                  }`}
                >
                  Sin asociar
                </button>
                {ordenesTrabajo.length === 0? (
                  <span className="text-xs text-gray-500 py-1.5">No hay OTs activas</span>
                ) : ordenesTrabajo.map(ot => (
                  <div key={ot.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSeleccionarOT(ot)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        form.ot_id === ot.id
                        ? 'bg-cyan-600 text-white border-2 border-cyan-400'
                          : 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500'
                      }`}
                    >
                      OT-{ot.numero || ot.id} <span className="text-gray-400">
                        | {ot.patente || 'S/P'} | {ot.marca || 'S/M'} | {ot.modelo || 'S/M'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const otCompleta = await api.get(`ordenes_trabajo/${ot.id}`);
                          const cliente = {
                            rut: otCompleta.rut_cliente,
                            nombre: otCompleta.nombre_cliente || otCompleta.cliente_nombre,
                            celular: otCompleta.celular || otCompleta.cliente_celular || 'S/I',
                            patente: otCompleta.patente,
                            marca: otCompleta.marca,
                            modelo: otCompleta.modelo
                          };
                          abrirOTEnNuevaVentana(otCompleta, cliente);
                        } catch (err) {
                          setMensaje('Error al abrir OT: ' + err.message, 'error');
                        }
                      }}
                      className="w-7 h-7 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded flex items-center justify-center transition-colors"
                      title="Ver OT completa"
                    >
                      👁
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {form.ot_id && repuestosOTSeleccionada.length > 0 && (
              <div className="col-span-12 bg-blue-900/20 border border-blue-500/30 rounded p-3">
                <div className="text-xs text-blue-400 font-bold mb-2">
                  📋 Repuestos de esta OT - Click para seleccionar:
                </div>
                <div className="flex flex-wrap gap-2">
                  {repuestosOTSeleccionada.map((r, index) => {
                    const prod = productos.find(p => p.sku === r.sku);
                    const stockLocal = prod?.stock_local || 0;
                    const sinStock = stockLocal < r.cantidad;

                    return (
                      <button
                        key={`${r.sku}-${index}`}
                        type="button"
                        onClick={() => {
  if (prod &&!sinStock) {
    setForm({
   ...form,
      producto_id: prod.id,
      cantidad: r.cantidad,
      motivo: `Retiro para OT-${ordenesTrabajo.find(o => o.id === form.ot_id)?.numero || form.ot_id}`
    });
    setProductoSeleccionado(prod); // ← AGREGA ESTA LÍNEA
    setBusqueda('');
  } else if (!prod) {
    setMensaje(`SKU ${r.sku} no está en inventario`, 'error');
  }
}}
                        disabled={sinStock}
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          sinStock
                         ? 'bg-red-900/30 text-red-500 border border-red-500/50 cursor-not-allowed'
                            : 'bg-gray-700 hover:bg-orange-600 text-white border border-gray-600'
                        }`}
                        title={sinStock? `Sin stock. Disponible: ${stockLocal}` : 'Click para retirar'}
                      >
                        {r.sku} - {r.nombre} x{r.cantidad} {sinStock && '⚠'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Motivo del retiro... *"
              value={form.motivo}
              onChange={e => setForm({...form, motivo: e.target.value})}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 outline-none"
              required
            />

            <button
              type="submit"
              disabled={cargando ||!form.producto_id || stockDisponible === 0 || parseInt(form.cantidad) > stockDisponible}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-bold transition-colors whitespace-nowrap"
            >
              {cargando? '⏳ Registrando...' : '✓ Registrar Retiro'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="bg-slate-700 px-4 py-2 border-b border-gray-600">
          <h3 className="text-sm font-bold text-white">Historial de Retiros ({retiros.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-xs sticky top-0">
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Producto</th>
                <th className="p-2 text-center">Cant</th>
                <th className="p-2 text-center">Bodega</th>
                <th className="p-2 text-center">Tipo</th>
                <th className="p-2 text-center">OT</th>
                <th className="p-2 text-left">Motivo</th>
                <th className="p-2 text-left">Responsable</th>
                <th className="p-2 text-right">Costo</th>
                <th className="p-2 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {retiros.length === 0? (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-gray-500">No hay retiros registrados</td>
                </tr>
              ) : retiros.map(r => (
                <tr key={r.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="p-2 text-xs whitespace-nowrap">
                    {new Date(r.creado).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: '2-digit' })}
                    <div className="text-gray-500">
                      {new Date(r.creado).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="font-bold text-xs text-cyan-400">{r.sku}</div>
                    <div className="text-xs text-gray-400 truncate max-w-32">{r.nombre_producto}</div>
                  </td>
                  <td className="p-2 text-center font-bold text-orange-400">{r.cantidad}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${r.bodega === 'bodega'? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'}`}>
                      {r.bodega === 'bodega'? 'Bodega' : 'Local'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTipoColor(r.tipo_retiro)}`}>
                      {r.tipo_retiro.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      {r.ot_id? (
                        <>
                          <button
                            onClick={() => {
                              try {
                                const otCompleta = ordenesTrabajo.find(ot => ot.id === r.ot_id);

                                if (!otCompleta) {
                                  setMensaje('No se encontró la OT', 'error');
                                  return;
                                }

                                const cliente = {
                                  rut: otCompleta.rut_cliente,
                                  nombre: otCompleta.nombre_cliente || otCompleta.cliente_nombre,
                                  celular: otCompleta.celular || otCompleta.cliente_celular || 'S/I',
                                  patente: otCompleta.patente,
                                  marca: otCompleta.marca,
                                  modelo: otCompleta.modelo
                                };

                                abrirOTEnNuevaVentana(otCompleta, cliente);
                              } catch (err) {
                                console.error('Error al abrir OT:', err);
                                setMensaje('Error al abrir OT: ' + err.message, 'error');
                              }
                            }}
                            className="w-6 h-6 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded flex items-center justify-center transition-colors"
                            title="Ver OT completa"
                          >
                            👁
                          </button>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-600/20 text-cyan-400 border-cyan-500/30">
                            OT-{r.ot_numero || r.ot_id}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-xs max-w-xs truncate" title={r.motivo}>{r.motivo}</td>
                  <td className="p-2 text-xs">{r.responsable || '-'}</td>
                  <td className="p-2 text-right text-yellow-400 text-xs font-bold">{formatearPrecio((r.precio_venta || r.costo_unitario) * r.cantidad)}</td>
                  <td className="p-2">
                    <div className="flex justify-center gap-1">
                     
                      <button
                        onClick={() => eliminarRetiro(r.id, r.ot_id, r.sku)}
                        className="w-8 h-8 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded flex items-center justify-center transition-colors"
                        title="Eliminar y devolver stock"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

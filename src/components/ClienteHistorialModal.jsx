import { useState, useEffect } from 'react';
import { useRefresh } from '../components/RefreshContext';
import { formatearPrecio } from '../utils/calculations';
import OrdenTrabajoForm from './OrdenTrabajoForm';
import ClienteForm from './ClienteForm';
import { abrirOTEnNuevaVentana } from '../utils/imprimirOT';
const API_URL = import.meta.env.VITE_API_URL;
const [modalEliminarOT, setModalEliminarOT] = useState(false);
const [otAEliminar, setOtAEliminar] = useState(null);
const [claveSeguridad, setClaveSeguridad] = useState('');
const [errorClave, setErrorClave] = useState('');


export default function ClienteHistorialModal({ rut, onCerrar, setMensaje = () => {} }) {
  const { triggerRefresh, refreshKey } = useRefresh();
  const [historial, setHistorial] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [stats, setStats] = useState({ totalVisitas: 0, totalGastado: 0, ultimaVisita: '', totalOT: 0, diasPromedio: 0 });
  const [clienteParaOT, setClienteParaOT] = useState(null);
  const [otEditando, setOtEditando] = useState(null);
  const [mostrarFormVehiculo, setMostrarFormVehiculo] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);
  const [busquedaPatente, setBusquedaPatente] = useState('');

// DESPUÉS - USA 12:00 PA QUE NO SE CORRA
const parsearFechaBackend = (fechaStr) => {
  if (!fechaStr) return null;
  const d = new Date(fechaStr);
  return isNaN(d.getTime())? null : d;
};

  useEffect(() => {
    cargarDatos();
  }, [rut, refreshKey]);

  useEffect(() => {
    filtrarOrdenes();
  }, [busquedaPatente, ordenes]);

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/clientes/rut/${rut}/historial`);
      if (!res.ok) throw new Error('Error al cargar historial');
      const data = await res.json();

      if (data.ingresos.length > 0) {
        setCliente(data.ingresos[0]);
        setHistorial(data.ingresos);
        setOrdenes(data.ots);

        // ✅ FIX 1: Calcular ultimaVisita en el frontend usando la fecha más reciente entre ingresos y OTs
        const fechasIngresos = data.ingresos.map(i => parsearFechaBackend(i.creado)).filter(Boolean);
        const fechasOTs = data.ots.map(o => parsearFechaBackend(o.fecha_creacion)).filter(Boolean);
        const todasFechas = [...fechasIngresos,...fechasOTs];
        const ultimaFechaReal = todasFechas.length > 0? new Date(Math.max(...todasFechas)) : null;

        setStats({
        ...data.stats,
          ultimaVisita: ultimaFechaReal? ultimaFechaReal.toISOString() : data.stats.ultimaVisita
        });
      }
    } catch (err) {
      console.error('Error cargarDatos:', err);
      setMensaje('Error al cargar datos del cliente', 'error');
    }
  };

  const filtrarOrdenes = () => {
    if (!busquedaPatente.trim()) {
      setOrdenesFiltradas(ordenes);
      return;
    }
    const b = busquedaPatente.toLowerCase();
    const filtradas = ordenes.filter(ot =>
      ot.patente.toLowerCase().includes(b) ||
      ot.marca.toLowerCase().includes(b) ||
      ot.modelo.toLowerCase().includes(b)
    );
    setOrdenesFiltradas(filtradas);
  };

const calcularDiasEnTaller = (ot) => {
  const inicio = parsearFechaBackend(ot.fecha_creacion);
  if (!inicio) return 1;

  // ✅ Solo para si está Entregado, todo lo demás sigue corriendo
  let fechaFin;
  if (ot.estado_ot === 'Entregado' && ot.fecha_entrega) {
    fechaFin = parsearFechaBackend(ot.fecha_entrega);
  } else {
    fechaFin = new Date(); // Sigue corriendo hasta que entreguen
  }

  inicio.setHours(0, 0, 0, 0);
  fechaFin.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(fechaFin - inicio);
  const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return dias < 1? 1 : dias;
};

const cambiarEstadoOT = async (otId, nuevoEstado) => {
  // ← ACTUALIZA LA UI ALTIRO - OPTIMISTIC UPDATE
  setOrdenes(prev => prev.map(o => 
    o.id === otId ? { ...o, estado_ot: nuevoEstado } : o
  ));
  setOrdenesFiltradas(prev => prev.map(o => 
    o.id === otId ? { ...o, estado_ot: nuevoEstado } : o
  ));

  try {
    const otActual = ordenes.find(o => o.id === otId);
    if (!otActual) return;

    const payload = {
      estado: nuevoEstado,
      fecha_entrega: nuevoEstado === 'Entregado'? new Date().toLocaleDateString('en-CA') : otActual.fecha_entrega,
      tecnico_id: otActual.tecnico_id || null
    };

    const res = await fetch(`${API_URL}/ordenes_trabajo/${otId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      // ← SI FALLA, REVIRTE EL CAMBIO
      setOrdenes(prev => prev.map(o => 
        o.id === otId ? { ...o, estado_ot: otActual.estado_ot } : o
      ));
      setOrdenesFiltradas(prev => prev.map(o => 
        o.id === otId ? { ...o, estado_ot: otActual.estado_ot } : o
      ));
      setMensaje(data.error, 'error');
      return;
    }

    if (data.mensaje) {
      setMensaje(data.mensaje, 'success');
    }
    
    triggerRefresh();
    cargarDatos(); // ← Recarga para sincronizar con BD
    
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    // ← REVIRTE SI HAY ERROR DE RED
    const otActual = ordenes.find(o => o.id === otId);
    setOrdenes(prev => prev.map(o => 
      o.id === otId ? { ...o, estado_ot: otActual.estado_ot } : o
    ));
    setMensaje('Error al actualizar estado', 'error');
  }
};

const abrirModalEliminarOT = (ot) => {
  setOtAEliminar(ot);
  setClaveSeguridad('');
  setErrorClave('');
  setModalEliminarOT(true);
};

const confirmarEliminarOT = async () => {
  if (claveSeguridad!== 'taller2026') { // ← CAMBIA ESTA CLAVE WN
    setErrorClave('Clave incorrecta');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/ordenes_trabajo/${otAEliminar.id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error, 'error');
      return;
    }

    setMensaje(data.mensaje || 'OT eliminada', 'success');
    setModalEliminarOT(false);
    triggerRefresh();
    cargarDatos();
  } catch (err) {
    setMensaje('Error al eliminar OT', 'error');
  }
};

  const eliminarVehiculo = async (vehiculoId, patente) => {
    if (!window.confirm(`¿Eliminar vehículo ${patente}?\n\nSe eliminarán también todas sus OT asociadas.`)) return;
    try {
      const otsPatente = ordenes.filter(o => o.patente === patente);
      for (const ot of otsPatente) {
        await fetch(`${API_URL}/ordenes_trabajo/${ot.id}`, { method: 'DELETE' });
      }

      await fetch(`${API_URL}/clientes/${vehiculoId}`, { method: 'DELETE' });

      setMensaje(`Vehículo ${patente} eliminado`, 'success');
	  triggerRefresh();
      cargarDatos();
    } catch (err) {
      setMensaje('Error al eliminar vehículo', 'error');
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'Pendiente': 'bg-yellow-600',
      'En Taller': 'bg-blue-600',
      'En Proceso': 'bg-blue-600',
      'Esperando Repuesto': 'bg-orange-600',
      'Listo': 'bg-green-600',
      'Finalizado': 'bg-green-600',
      'Entregado': 'bg-gray-600'
    };
    return colores[estado] || 'bg-gray-600';
  };

  if (!cliente) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-6xl my-8">
<div className="p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-30 rounded-t-lg">
  <div className="flex justify-between items-start mb-3">
    {/* IZQUIERDA: NOMBRE */}
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-2xl">
          {cliente.tipo_cliente === 'empresa' ? '🏢' : '👤'}
        </span>
        <h2 className="text-2xl font-bold text-white">
          {cliente.tipo_cliente === 'empresa' 
            ? cliente.razon_social || cliente.nombre 
            : cliente.nombre}
        </h2>
      </div>

      {/* SOLO PERSONA NATURAL: RUT Y CEL ARRIBA */}
      {cliente.tipo_cliente !== 'empresa' && (
        <div className="mt-2 text-sm text-gray-400">
          RUT: {cliente.rut} | Cel: {cliente.celular || '-'}
        </div>
      )}
    </div>

    {/* CENTRO: LOGO */}
<div className="flex-1 flex justify-start ml-8">
  <img
    src="/BN.png"
    alt="Logo BN"
    className="h-20 object-contain opacity-90 scale-100"
  />
</div>

    {/* DERECHA: BOTONES */}
    <div className="flex gap-2">
      <button
        onClick={() => {
          setVehiculoEditando(null);
          setMostrarFormVehiculo(true);
        }}
        className="px-3 py-2 bg-green-600 rounded font-bold text-sm hover:bg-green-700"
      >
        ➕ Nuevo Vehículo
      </button>
      <button onClick={onCerrar} className="px-4 py-2 bg-gray-600 rounded font-bold hover:bg-gray-700">
        ✕ Cerrar
      </button>
    </div>
  </div>

  {/* DATOS FACTURACIÓN - ABAJO Y ALINEADO IZQUIERDA */}
  {(cliente.tipo_cliente === 'empresa' || cliente.direccion_facturacion || cliente.correo_facturacion) && (
    <div className="p-3 bg-slate-700/50 rounded border border-slate-600"> 
      <div className="text-sm font-bold text-blue-400 mb-2">📄 DATOS FACTURACIÓN</div> 
      
      <div className="space-y-1">
        {/* SI ES EMPRESA: TODO ACÁ */}
        {cliente.tipo_cliente === 'empresa' && (
          <>
            <div className="text-sm text-gray-300"> 
              <span className="text-gray-400">Contacto:</span> {cliente.nombre}
            </div>
            <div className="text-sm text-gray-300"> 
              <span className="text-gray-400">RUT:</span> {cliente.rut}
            </div>
            {cliente.celular && (
              <div className="text-sm text-gray-300"> 
                <span className="text-gray-400">Cel:</span> {cliente.celular}
              </div>
            )}
            {cliente.giro && (
              <div className="text-sm text-gray-300"> 
                <span className="text-gray-400">Giro:</span> <span className="text-cyan-400">{cliente.giro}</span>
              </div>
            )}
          </>
        )}
        
        {/* DIRECCIÓN Y EMAIL */}
        {cliente.direccion_facturacion && ( 
          <div className="text-sm text-gray-300"> 
            <span className="text-gray-400">Dirección:</span> {cliente.direccion_facturacion} 
          </div> 
        )}
        {cliente.correo_facturacion && ( 
          <div className="text-sm text-gray-300"> 
            <span className="text-gray-400">Email Facturación:</span> {cliente.correo_facturacion} 
          </div> 
        )}
      </div>
    </div> 
  )}
</div> 

          <div className="grid grid-cols-5 gap-3 p-4 bg-gray-900 sticky top-0 z-20 border-b border-gray-700">
            <div className="bg-slate-700 p-3 rounded">
              <div className="text-xs text-gray-400">Ingresos</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalVisitas}</div>
            </div>
            <div className="bg-slate-700 p-3 rounded">
              <div className="text-xs text-gray-400">Órdenes Trabajo</div>
              <div className="text-2xl font-bold text-blue-400">{stats.totalOT}</div>
            </div>
            <div className="bg-slate-700 p-3 rounded">
              <div className="text-xs text-gray-400">Última Visita</div>
              <div className="text-xl font-bold text-green-400">
                {stats.ultimaVisita? parsearFechaBackend(stats.ultimaVisita).toLocaleDateString('es-CL') : '-'}
              </div>
            </div>
            <div className="bg-slate-700 p-3 rounded">
              <div className="text-xs text-gray-400">Días Promedio</div>
              <div className="text-2xl font-bold text-purple-400">{stats.diasPromedio}</div>
            </div>
            <div className="bg-slate-700 p-3 rounded">
              <div className="text-xs text-gray-400">Total Gastado</div>
              <div className="text-xl font-bold text-yellow-400">{formatearPrecio(stats.totalGastado)}</div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">VEHICULOS CLIENTE</h3>
                <span className="text-xs text-gray-400">{historial.length} vehículo(s)</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left p-2">Fecha ingreso</th>
                    <th className="text-left p-2">Vehículo</th>
                    <th className="text-center p-2">Año</th>
                    <th className="text-center p-2">Patente</th>
                    <th className="text-center p-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((ing, idx) => (
                    <tr key={ing.id} className={idx % 2 === 0? 'bg-gray-900/50' : ''}>
                      <td className="p-2">{ing.creado? parsearFechaBackend(ing.creado).toLocaleDateString('es-CL') : '-'}</td>
                      <td className="p-2 font-bold text-xs uppercase">{ing.marca} {ing.modelo}</td>
                      <td className="text-center p-2">
                        <span className="px-2 py-1 bg-gray-700 rounded text-xs font-bold">{ing.anio || '-'}</span>
                      </td>
                      <td className="text-center p-2">
                        <span className="px-2 py-1 bg-slate-600 rounded text-xs font-bold uppercase">{ing.patente}</span>
                      </td>
                      <td className="text-center p-2">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => setClienteParaOT(ing)}
                            className="px-2 py-1 bg-green-600 rounded text-xs font-bold hover:bg-green-700"
                            title="Nueva OT"
                          >
                            + OT
                          </button>
                          <button
                            onClick={() => setVehiculoEditando(ing)}
                            className="px-2 py-1 bg-yellow-600 rounded text-xs font-bold hover:bg-yellow-700"
                            title="Editar vehículo"
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => eliminarVehiculo(ing.id, ing.patente)}
                            className="px-2 py-1 bg-red-600 rounded text-xs font-bold hover:bg-red-700"
                            title="Eliminar vehículo"
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

            <div>
              <div className="mb-1 px-1">
                <div className="text-yellow-500/70 italic">
                  ⚠ Al cambiar estado a "Finalizado" se descontarán automáticamente los repuestos de inventario utilizados.
                </div>
              </div>

              <div className="flex justify-between items-center mb-2 gap-2">
                <h3 className="text-lg font-bold">Órdenes de Trabajo</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar patente o vehículo..."
                    value={busquedaPatente}
                    onChange={e => setBusquedaPatente(e.target.value)}
                    className="px-3 py-1 rounded text-black text-sm w-56"
                  />
                  <span className="text-xs text-gray-400">{ordenesFiltradas.length} OT(s)</span>
                </div>
              </div>
              {ordenesFiltradas.length > 0? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="p-2 w-12"></th>
                      <th className="text-center p-2">Fecha Ingreso</th>
					  <th className="text-center p-2">Fecha Salida</th>
                      <th className="text-left p-2">Vehículo</th>
                      <th className="text-center p-2">Patente</th>
                      <th className="text-left p-2">Detalle</th>
                      <th className="text-center p-2">Días Taller</th>
                      <th className="text-center p-2">Estado</th>
                      <th className="text-right p-2">Valor Trabajo</th>
                      <th className="text-center p-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesFiltradas.map((ot, idx) => {
                      const repInventario = (ot.repuestos_usados || []).filter(r => r.desde_inventario === true);
                      const repManual = (ot.repuestos_usados || []).filter(r =>!r.desde_inventario);
                      const diasTaller = calcularDiasEnTaller(ot);

                      return (
                        <tr key={ot.id} className={idx % 2 === 0? 'bg-gray-900/50' : ''}>
                          <td className="p-2 text-center w-12">
                            {(ot.estado_ot === 'Pendiente' && (ot.monto_final === 0 ||!ot.monto_final)) && (
                              <span
                                className="text-red-500 text-xl animate-pulse inline-block"
                                title="OT sin valorizar"
                              >
                                ⚠
                              </span>
                            )}
                          </td>
                          <td className="text-center p-2">{ot.fecha_creacion? parsearFechaBackend(ot.fecha_creacion).toLocaleDateString('es-CL') : '-'}</td>
						  <td className="text-center p-2">{ot.fecha_entrega? parsearFechaBackend(ot.fecha_entrega).toLocaleDateString('es-CL') : '-'}</td>
                          <td className="p-2 font-bold text-xs uppercase">{ot.marca} {ot.modelo}</td>
                          <td className="text-center p-2">
                            <span className="px-2 py-1 bg-slate-600 rounded text-xs font-bold uppercase">{ot.patente}</span>
                          </td>
                          <td className="p-2">
                            <div className="text-xs space-y-1">
                              <div className="font-bold">{ot.servicios?.join(', ') || 'Sin servicios'}</div>
                              {ot.descripcion_servicio && (
                                <div className="text-gray-400">{ot.descripcion_servicio}</div>
                              )}
                              {ot.kilometraje > 0 && (
                                <div className="text-yellow-400">KM: {ot.kilometraje.toLocaleString('es-CL')}</div>
                              )}
                              {ot.tecnico_asignado && (
                                <div className="text-blue-400">Téc: {ot.tecnico_asignado}</div>
                              )}
                              {ot.checklist_recepcion && ot.checklist_recepcion.length > 0 && (
                                <div className="text-cyan-400">✓ Checklist: {ot.checklist_recepcion.length} items</div>
                              )}
                              {repInventario.length > 0 && (
                                <div className="text-green-400">
                                  🔧 Rep. Inv: {repInventario.reduce((sum, r) => sum + (r.cantidad || 1), 0)} unid.
                                </div>
                              )}
                              {repManual.length > 0 && (
                                <div className="text-orange-400">
                                  📝 Rep. Manual: {repManual.reduce((sum, r) => sum + (r.cantidad || 1), 0)} unid.
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 ${ot.estado_ot === 'Entregado'? 'bg-purple-600' : 'bg-blue-600'} rounded text-xs font-bold ${ot.estado_ot!== 'Entregado'? 'animate-pulse' : ''}`}>
                              {diasTaller} día{diasTaller!== 1? 's' : ''}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <select
                              value={ot.estado_ot}
                              onChange={e => cambiarEstadoOT(ot.id, e.target.value)}
                              disabled={ot.estado_ot === 'Entregado'}
                              className={`px-2 py-1 rounded text-xs font-bold text-white ${getEstadoColor(ot.estado_ot)} border-0 ${ot.estado_ot === 'Entregado'? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="En Proceso">En Proceso</option>
                              <option value="Esperando Repuesto">Esperando Repuesto</option>
                              <option value="Finalizado">Finalizado</option>
                              <option value="Entregado">Entregado</option>
                            </select>
                          </td>
                          <td className="text-right p-2 font-bold text-green-400">
                            {formatearPrecio(ot.monto_final || ot.monto_estimado || 0)}
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => setOtEditando(ot)}
                                className="px-2 py-1 bg-yellow-600 rounded text-xs font-bold hover:bg-yellow-700"
                                title="Editar OT - agregar repuestos/valor final"
                              >
                                ✏
                              </button>
                              <button
                                onClick={() => abrirOTEnNuevaVentana(ot, cliente)}
                                className="px-2 py-1 bg-blue-600 rounded text-xs font-bold hover:bg-blue-700"
                                title="Ver/Imprimir OT"
                              >
                                👁
                              </button>
                              <button
                                onClick={() => eliminarOT(ot.id, ot.patente)}
                                className="px-2 py-1 bg-red-600 rounded text-xs font-bold hover:bg-red-700"
                                title="Eliminar OT"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-900/50 rounded">
                  {busquedaPatente? 'No se encontraron OT con esa patente/vehículo' : 'No hay órdenes de trabajo registradas'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(clienteParaOT || otEditando) && (
  <OrdenTrabajoForm
    cliente={clienteParaOT || historial.find(h => h.patente === otEditando?.patente)}
    otExistente={otEditando}
    onGuardar={() => {
      triggerRefresh();
      cargarDatos();
      setClienteParaOT(null);
      setOtEditando(null);
    }}
    onCerrar={() => {
      setClienteParaOT(null);
      setOtEditando(null);
    }}
    setMensaje={setMensaje}  // ← AGREGA ESTA LÍNEA
  />
)}

      {(mostrarFormVehiculo || vehiculoEditando) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[150] p-4">
          <div className="w-full max-w-3xl">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => {
                  setMostrarFormVehiculo(false);
                  setVehiculoEditando(null);
                }}
                className="px-4 py-2 bg-gray-600 rounded font-bold hover:bg-gray-700"
              >
                ✕ Cerrar
              </button>
            </div>
            <ClienteForm
  clienteEditando={vehiculoEditando}
  rutPrellenado={vehiculoEditando? null : cliente.rut}
  modoVehiculo={!!vehiculoEditando || mostrarFormVehiculo}
  onGuardar={() => {
    cargarDatos();
    setMostrarFormVehiculo(false);
    setVehiculoEditando(null);
  }}
  onLimpiar={() => {
    setMostrarFormVehiculo(false);
    setVehiculoEditando(null);
  }}
/>
          </div>
        </div>
      )}
    </>
  );
}


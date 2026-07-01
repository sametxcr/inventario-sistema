import { useState, useEffect } from 'react';
import { abrirVistaCotizacion } from '../App';

const API_URL = 'http://localhost:3001/api';

export default function HistorialCotizaciones({
  setTabActivo,
  setListaCotizacion,
  setCotizacionEditando,
  setModalCotizacion,
  setValidezDias,
  setOtEnEdicion,
  setMostrarModalOT,
  setMensaje // ← AGREGA ESTO
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargarCotizaciones = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/cotizaciones/historial`);
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setCotizaciones(data);
    } catch (err) {
      console.error('Error:', err);
      setMensaje('Error cargando cotizaciones', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCotizaciones();
  }, []);

  const cotizacionesFiltradas = cotizaciones.filter(cot => {
    return (
      cot.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      cot.patente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      cot.rut_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(cot.id).includes(busqueda)
    );
  });

  const verCotizacion = async (cot) => {
    try {
      const res = await fetch(`${API_URL}/cotizaciones/${cot.id}`);
      if (!res.ok) throw new Error('Error al cargar cotización');
      const cotCompleta = await res.json();
      abrirVistaCotizacion(cotCompleta, setMensaje);
    } catch (err) {
      setMensaje('Error al ver cotización: ' + err.message, 'error');

    }
  };

const editarCotizacion = async (cot) => {
  try {
    const res = await fetch(`${API_URL}/cotizaciones/${cot.id}`);
    if (!res.ok) throw new Error('Error al cargar');
    const cotCompleta = await res.json();

    setListaCotizacion(cotCompleta.items || []);
    setCotizacionEditando(cotCompleta.id);
    setModalCotizacion(cotCompleta);
    setTabActivo('cotizacion');

    if (cotCompleta.validez_hasta) {
      try {
        const parsearFecha = (fechaStr) => {
          if (!fechaStr) return null;
          if (fechaStr.includes('-') && fechaStr.split('-')[0].length === 2) {
            const [d, m, a] = fechaStr.split('-');
            return new Date(Number(a), Number(m)-1, Number(d), 12, 0, 0);
          }
          const fecha = new Date(fechaStr);
          return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0);
        };

        const fechaValidez = parsearFecha(cotCompleta.validez_hasta);
        const fechaCreacion = parsearFecha(cot.creado_at);
        const diffTime = fechaValidez.getTime() - fechaCreacion.getTime();
        const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));

        setTimeout(() => {
          setValidezDias(dias > 0? dias : 15);
        }, 0);
      } catch (e) {
        console.error(e);
        setTimeout(() => setValidezDias(15), 0);
      }
    } else {
      setTimeout(() => setValidezDias(15), 0);
    }
  } catch (err) {
    setMensaje('Error: ' + err.message, 'error');
  }
};

  const eliminarCotizacion = async (id) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;

    try {
      const res = await fetch(`${API_URL}/cotizaciones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setMensaje('Cotización eliminada', 'success');
      cargarCotizaciones();
    } catch (err) {
      setMensaje('Error: ' + err.message, 'error');
    }
  };

const abrirOTDesdeCot = async (cot) => {
  const res = await fetch(`${API_URL}/cotizaciones/${cot.id}`);
  
  if (!res.ok) {
    setMensaje(`Error ${res.status}: No se encontró la cotización`, 'error');

    return;
  }
  
  const cotCompleta = await res.json();
  
  // Limpia el estado primero pa que no herede el id
  setOtEnEdicion(null);
  
  setTimeout(() => {
    setOtEnEdicion({
      desde_cotizacion: cotCompleta.id,
      patente: cotCompleta.patente,
      rut_cliente: cotCompleta.rut_cliente,
      nombre_cliente: cotCompleta.nombre_cliente,
      marca: cotCompleta.marca,
      modelo: cotCompleta.modelo,
      anio: cotCompleta.anio,
      repuestos_usados: cotCompleta.items.filter(i => i.tipo !== 'mano_obra').map(i => ({
        sku: i.sku || 'MANUAL',
        nombre: i.nombre,
        cantidad: Number(i.cantidad) || 1,
        precio_venta: Number(i.precio_venta || i.precio || 0),
        desde_inventario: i.desde_inventario || false
      })),
      mano_obra: cotCompleta.items.filter(i => i.tipo === 'mano_obra').map(i => ({
        descripcion: i.nombre,
        cantidad: Number(i.cantidad) || 1,
        valor_unit: Number(i.precio_venta || i.precio || 0)
      })),
      abono: cotCompleta.abono || 0,
      observaciones: `Desde COT #${cotCompleta.id}. ${cotCompleta.observaciones || ''}`,
      estado_ot: 'Pendiente'
    });
    setMostrarModalOT(true);
  }, 0);
};

  const formatearPrecio = (num) => '$' + Number(num || 0).toLocaleString('es-CL');

  const calcularDias = (fecha) => {
    if (!fecha || fecha === '-') return '';
    try {
      let f;
      if (fecha.includes('-') && fecha.split('-')[0].length === 2) {
        const [dia, mes, anio] = fecha.split('-');
        f = new Date(Number(anio), Number(mes)-1, Number(dia), 12, 0, 0);
      } else {
        const temp = new Date(fecha);
        f = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 12, 0, 0);
      }
      const hoy = new Date();
      const hoyMediodia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0);
      const diff = Math.floor((hoyMediodia - f) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'hoy';
      if (diff === 1) return 'ayer';
      if (diff < 7) return `hace ${diff} días`;
      return fecha;
    } catch {
      return fecha;
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-gray-800 to-gray-800/80 p-3 rounded-xl border border-gray-700/50 mb-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Historial de Cotizaciones
            </h2>
            <div className="text-sm text-gray-400">
              {cotizacionesFiltradas.length} cotizaciones
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por cliente, patente, RUT o ID..."
                className="w-full px-4 py-2.5 rounded-lg bg-gray-900/70 text-white border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {cargando? (
          <div className="text-center text-gray-400 py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-3">Cargando cotizaciones...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cotizacionesFiltradas.map(cot => (
              <div
                key={cot.id}
                className="group bg-gray-800/60 backdrop-blur-sm p-1 rounded-xl border border-gray-700/50 hover:border-cyan-500/30 hover:bg-gray-800/80 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-900/20"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-cyan-400 font-mono font-bold text-lg tracking-wide">
                        #{String(cot.id).padStart(4, '0')}
                      </span>
                      {cot.items?.length > 0 && (
  <span className="text-xs text-gray-500">
    {(() => {
      const repuestos = cot.items.filter(i => i.tipo === 'repuesto' ||!i.tipo);
      const cantidad = repuestos.reduce((sum, i) => sum + (i.cantidad || 1), 0);
      return `${cantidad} ${cantidad === 1? 'repuesto utilizado' : 'repuestos utilizados'}`;
    })()}
  </span>
)}
                      {(cot.marca || cot.modelo) && (
                        <span className="text-sm text-gray-400">
                          {cot.marca} {cot.modelo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-white font-semibold">
                        {cot.nombre_cliente}
                      </h3>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300 font-mono text-sm">
                        {cot.patente}
                      </span>
                      <span className="text-amber-400 font-medium text-sm">
                        ({cot.anio || '—'})
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                        {calcularDias(cot.creado_at)}
                      </span>
                      <span>•</span>
                      <span>Válida hasta {cot.validez_hasta}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-1xl font-bold text-emerald-400 tabular-nums">
                        {formatearPrecio(cot.total)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-4 border-l border-gray-700/50">
                      <button
                        onClick={() => verCotizacion(cot)}
                        className="w-9 h-9 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-900/50 border border-blue-600/30"
                        title="Ver cotización"
                      >
                        <span className="text-sm">👁</span>
                      </button>

                      <button
                        onClick={() => editarCotizacion(cot)}
                        className="w-9 h-9 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-900/50 border border-amber-600/30"
                        title="Editar"
                      >
                        <span className="text-sm">✏</span>
                      </button>

                      <button
  onClick={() => abrirOTDesdeCot(cot)}
  disabled={cot.convertida}
  className="w-9 h-9 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded flex items-center justify-center transition-colors disabled:bg-gray-600/20 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-600/20"
  title={cot.convertida ? 'Ya convertida a OT' : 'Crear OT desde cotización'}
>
  <span className="text-sm">{cot.convertida ? '✅' : '📋'}</span>
</button>

                      <button
                        onClick={() => eliminarCotizacion(cot.id)}
                        className="w-9 h-9 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-red-900/50 border border-red-600/30"
                        title="Eliminar"
                      >
                        <span className="text-sm">🗑</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {cotizacionesFiltradas.length === 0 &&!cargando && (
              <div className="text-center py-16 text-gray-500">
                <div className="text-5xl mb-3 opacity-20">📄</div>
                <p>No se encontraron cotizaciones</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
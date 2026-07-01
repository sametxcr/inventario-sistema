import { useState, useEffect } from 'react';
import { getFechaChile, parsearFechaChile } from '../utils/fechaChile';
import { useRefresh } from '../components/RefreshContext';
import { api } from '../api';
import { formatearPrecio } from '../utils/calculations';
import { getFechaHoraChileISO } from '../utils/fechaChile';

const SERVICIOS_CHECKBOX = [
  'Cambio de aceite y filtro',
  'Alineación y/o balanceo',
  'Revisión de frenos',
  'Aire acondicionado',
  'Cambio de filtros',
  'Reparación de motor',
  'Sistema de transmisión',
  'Suspensión y dirección',
  'Sistema de escape',
  'Sistema de enfriamiento',
  'Escaneo electrónico',
  'Sistema eléctrico',
  'Luces y cableado',
  'Otros',
  'Potenciacion Vehiculo'
];

const CHECKLIST_RECEPCION = [
  'Rayones Carrocería',
  'Choques Visibles',
  'Luces Funcionando',
  'Neumáticos OK',
  'Nivel Aceite',
  'Nivel Agua/Refrigerante',
  'Rueda Repuesto',
  'Parabrisas o Vidrios',
  'Tapiz Dañado'
];

const IVA = 0.19;

export default function OrdenTrabajoForm({ cliente, otExistente, onGuardar, onCerrar, onIrAClientes, setMensaje = (msg) => console.log('hola gay:', msg) }) {
	  console.log('PROPS RECIBIDOS:', { cliente, otExistente, onGuardar, onCerrar, onIrAClientes, setMensaje }); // ← AGREGA ESTA
  const { triggerRefresh } = useRefresh();// ← FIX 1: Faltaban ()
  const safeSetMensaje = typeof setMensaje === 'function' ? setMensaje : (msg) => console.log('MENSAJE:', msg);
  const [desdeCotizacion, setDesdeCotizacion] = useState(null);
  const [guardando, setGuardando] = useState(false); // ← AGREGA ESTO
  const [servicios, setServicios] = useState([]);
  const [obsServicios, setObsServicios] = useState({});
  const [descripcion, setDescripcion] = useState('');
  const [estadoOT, setEstadoOT] = useState('Pendiente');
  const [kilometraje, setKilometraje] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [abono, setAbono] = useState(0);

  const [checklist, setChecklist] = useState(
    CHECKLIST_RECEPCION.map(item => ({ item, estado: false, obs: '' }))
  );

  const [itemsTabla, setItemsTabla] = useState([
    { id: 1, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
    { id: 2, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
    { id: 3, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
    { id: 4, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
    { id: 5, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
    { id: 6, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
  ]);

  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  const [repuestosDisponibles, setRepuestosDisponibles] = useState([]);

  // CARGAR DATOS SI ESTAMOS EDITANDO


useEffect(() => {
  if (otExistente) {
    // Si viene de cotización, guardamos el ID
    if (otExistente.desde_cotizacion) {
      setDesdeCotizacion(otExistente.desde_cotizacion);
    }

    // ← DATOS GENERALES
    setKilometraje(otExistente.kilometraje || '');
    setTecnico(otExistente.tecnico_asignado || '');
    setDescripcion(otExistente.descripcion_servicio || otExistente.observaciones || '');
    setEstadoOT(otExistente.estado_ot || 'Pendiente');
    setAbono(Number(otExistente.abono) || 0); // ← ESTE FALTABA

    // ← SERVICIOS Y OBSERVACIONES
    setServicios(otExistente.servicios || []);
    setObsServicios(otExistente.obs_servicios || {});

    // ← CHECKLIST
    if (otExistente.checklist_recepcion && Array.isArray(otExistente.checklist_recepcion)) {
      setChecklist(CHECKLIST_RECEPCION.map(item => {
        const encontrado = otExistente.checklist_recepcion.find(c => c.item === item);
        return encontrado
         ? { item, estado: true, obs: encontrado.obs || '' }
          : { item, estado: false, obs: '' };
      }));
    } else {
      setChecklist(CHECKLIST_RECEPCION.map(item => ({ item, estado: false, obs: '' })));
    }

    // ← REPUESTOS Y MANO DE OBRA
    const repuestosOT = (otExistente.repuestos_usados || []).map((r, idx) => ({
  id: 1000 + idx,
  tipo: 'REPUESTO',
  descripcion: r.nombre,
  cantidad: Number(r.cantidad) || 1,
  valor_unit: Number(r.precio_venta || r.precio_unitario || r.precio || 0),
  esDesdeBD: r.desde_inventario || false,
  sku: r.sku || '',
  retiro_id: r.retiro_id || null // ← AGREGA ESTA LÍNEA
}));

    const manoObraOT = (otExistente.mano_obra || []).map((m, idx) => ({
      id: 2000 + idx,
      tipo: 'MANO_OBRA',
      descripcion: m.descripcion,
      cantidad: Number(m.cantidad) || 1,
      valor_unit: Number(m.precio || m.valor_unit || m.precio_venta || 0),
      esDesdeBD: false,
      sku: ''
    }));

    const itemsCargados = [...repuestosOT,...manoObraOT];
    if (itemsCargados.length > 0) {
      setItemsTabla(itemsCargados);
    } else {
      setItemsTabla([
        { id: 1, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
        { id: 2, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
        { id: 3, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
        { id: 4, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
        { id: 5, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
        { id: 6, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
      ]);
    }
  } else {
    // Reset pa OT nueva
    setDesdeCotizacion(null);
    setServicios([]);
    setObsServicios({});
    setDescripcion('');
    setEstadoOT('Pendiente');
    setKilometraje('');
    setTecnico('');
    setAbono(0);
    setChecklist(CHECKLIST_RECEPCION.map(item => ({ item, estado: false, obs: '' })));
    setItemsTabla([
      { id: 1, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
      { id: 2, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
      { id: 3, tipo: 'REPUESTO', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
      { id: 4, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
      { id: 5, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
      { id: 6, tipo: 'MANO_OBRA', descripcion: '', cantidad: 1, valor_unit: 0, esDesdeBD: false, sku: '' },
    ]);
  }
}, [otExistente]);

  useEffect(() => {
    if (busquedaRepuesto.trim().length >= 2) cargarRepuestos();
    else setRepuestosDisponibles([]);
  }, [busquedaRepuesto]);

  const cargarRepuestos = async () => {
    const b = busquedaRepuesto.toLowerCase();
    const productos = await api.get('productos');
    const resultados = productos
     .filter(p => p.sku.toLowerCase().includes(b) || p.nombre.toLowerCase().includes(b))
     .slice(0, 10);
    setRepuestosDisponibles(resultados);
  };

  const agregarRepuestoInventario = (producto) => {
    const idxVacio = itemsTabla.findIndex(i => i.tipo === 'REPUESTO' &&!i.descripcion);
    if (idxVacio >= 0) {
      const nuevos = [...itemsTabla];
      nuevos[idxVacio] = {
       ...nuevos[idxVacio],
        descripcion: `${producto.sku} - ${producto.nombre}`.toUpperCase(),
        valor_unit: producto.precio_venta,
        esDesdeBD: true,
        sku: producto.sku
      };
      setItemsTabla(nuevos);
    } else {
      setItemsTabla([...itemsTabla, {
        id: Date.now(),
        tipo: 'REPUESTO',
        descripcion: `${producto.sku} - ${producto.nombre}`.toUpperCase(),
        cantidad: 1,
        valor_unit: producto.precio_venta,
        esDesdeBD: true,
        sku: producto.sku
      }]);
    }
    setBusquedaRepuesto('');
    setRepuestosDisponibles([]);
  };

  const actualizarItem = (id, campo, valor) => {
    setItemsTabla(prev =>
      prev.map(item => {
        if (item.id!== id) return item;
        if (item.esDesdeBD && campo === 'valor_unit') return item;

        let nuevoValor = valor;
        if (campo === 'descripcion') {
          nuevoValor = valor.toUpperCase();
        }
        if (campo === 'cantidad' || campo === 'valor_unit') {
          nuevoValor = parseFloat(valor) || 0;
        }

        return {...item, [campo]: nuevoValor };
      })
    );
  };

  const eliminarItem = (id) => {
    setItemsTabla(prev => prev.filter(item => item.id!== id));
  };

  const agregarFila = (tipo) => {
    setItemsTabla(prev => [...prev, {
      id: Date.now(),
      tipo,
      descripcion: '',
      cantidad: 1,
      valor_unit: 0,
      esDesdeBD: false,
      sku: ''
    }]);
  };

  const toggleServicio = (servicio) => {
    setServicios(prev => {
      const yaExiste = prev.includes(servicio);
      if (yaExiste) {
        setObsServicios(prevObs => {
          const newObs = {...prevObs };
          delete newObs[servicio];
          return newObs;
        });
        return prev.filter(s => s!== servicio);
      } else {
        return [...prev, servicio];
      }
    });
  };

  const toggleCheckItem = (itemName) => {
    setChecklist(prev =>
      prev.map(c => c.item === itemName? {...c, estado:!c.estado } : c)
    );
  };

  const updateCheckObs = (itemName, obs) => {
    setChecklist(prev =>
      prev.map(c => c.item === itemName? {...c, obs: obs.toUpperCase() } : c)
    );
  };

  const calcularTotales = () => {
    const itemsConValor = itemsTabla.filter(i => i.descripcion && i.cantidad > 0 && i.valor_unit > 0);
    const totalConIVA = itemsConValor.reduce((sum, i) => sum + (i.cantidad * i.valor_unit), 0);
    const neto = Math.round(totalConIVA / (1 + IVA));
    const iva = totalConIVA - neto;
    return { neto, iva, total: totalConIVA, itemsConValor };
  };

  // ← FIX 2: Calcula totales ANTES de usarlos
  const { neto, iva, total, itemsConValor } = calcularTotales();
  const saldo = Math.max(0, total - abono);

const handleSubmit = async (e) => {
  e.preventDefault();
  setGuardando(true);

  if (abono > total) {
    setMensaje(`El abono no puede ser mayor al total $${total.toLocaleString('es-CL')}`, 'error');
    
    setGuardando(false);
    return;
  }

  if (abono < 0) {
    setMensaje('El abono no puede ser negativo', 'error');
    
    setGuardando(false);
    return;
  }

  if (servicios.length === 0 && !descripcion.trim()) {
    setMensaje('Selecciona al menos un servicio o escribe una descripción', 'error');
    
    setGuardando(false);
    return;
  }

  if (!tecnico.trim()) {
    setMensaje('Debes asignar un técnico responsable', 'error');
    
    setGuardando(false);
    return;
  }

  const repuestosTabla = itemsConValor.filter(i => i.tipo === 'REPUESTO').map(r => ({
    sku: r.esDesdeBD ? r.sku : 'MANUAL',
    nombre: r.descripcion,
    precio_venta: r.valor_unit,
    cantidad: r.cantidad,
    desde_inventario: r.esDesdeBD || false
  }));

  const manoObraTabla = itemsConValor.filter(i => i.tipo === 'MANO_OBRA').map(m => ({
    descripcion: m.descripcion,
    cantidad: m.cantidad,
    valor_unit: m.valor_unit
  }));
	
  const ot = {
    patente: cliente.patente,
    rut_cliente: cliente.rut,
    fecha_creacion: otExistente?.fecha_creacion || getFechaHoraChileISO(),
    fecha_inicio_taller: otExistente?.fecha_inicio_taller || getFechaHoraChileISO(),
    fecha_entrega: otExistente?.fecha_entrega || null,
    dias_en_taller: otExistente?.dias_en_taller || 0,
    servicios: servicios,
    obs_servicios: obsServicios, // ← ESTO AHORA SÍ SE VA A GUARDAR
    descripcion_servicio: descripcion.trim().toUpperCase(),
    estado_ot: estadoOT,
    monto_estimado: total,
    monto_final: total,
    abono: Number(abono) || 0,
    kilometraje: parseInt(kilometraje) || 0,
    tecnico_asignado: tecnico.trim().toUpperCase(),
    checklist_recepcion: checklist.filter(c => c.estado),
    repuestos_usados: repuestosTabla,
    mano_obra: manoObraTabla,
    creado: otExistente?.creado || getFechaHoraChileISO(),
    actualizado: getFechaHoraChileISO()
  };

  console.log('📤 ENVIANDO OT CON OBS:', ot.obs_servicios); // ← PA DEBUGGEAR

try {
  let respuesta;
  if (otExistente?.id) {
    respuesta = await api.put(`ordenes_trabajo/${otExistente.id}`, ot);
    setMensaje('✅ OT actualizada correctamente', 'success');
  } else {
    respuesta = await api.post('ordenes_trabajo', ot);
    
    // ← NUEVO: Si viene de cotización, márcala como convertida
    if (desdeCotizacion) {
      api.put(`cotizaciones/${desdeCotizacion}/marcar-convertida`, {
        ot_id: respuesta.id
      });
      console.log('✅ Cotización marcada como convertida');
    }
    
    setMensaje('✅ OT creada correctamente', 'success');
  }

  
  
  
window.dispatchEvent(new CustomEvent('ot-creada'));
triggerRefresh();
onGuardar();
onCerrar();
if (onIrAClientes && !otExistente?.id) {
onIrAClientes();
}

} catch (err) {
    console.error('❌ ERROR GUARDANDO:', err);
    setMensaje(`❌ Error: ${err.message || 'No se pudo guardar'}`, 'error');
    
  } finally {
    setGuardando(false);
  }
};


  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-[300] p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-5xl my-8">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">
              {otExistente && otExistente.id ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {cliente.marca} {cliente.modelo} - {cliente.patente} | {cliente.nombre}
            </p>
          </div>
          <button onClick={onCerrar} className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
         

          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-900 rounded border border-gray-700">
            <div>
              <label className="block text-sm font-bold mb-2">Kilometraje</label>
              <input required type="number" className="w-full px-3 py-2 rounded text-black text-sm" placeholder="120000" value={kilometraje} onChange={e => setKilometraje(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Técnico Asignado</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded text-black text-sm uppercase"
                placeholder="CARLOS"
                value={tecnico}
                onChange={e => setTecnico(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Checklist Recepción Vehículo</label>
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-900 rounded border border-gray-700">
              {checklist.map((check, idx) => (
                <div key={idx} className="bg-gray-800 rounded p-2">
                  <label className="flex items-center gap-2 cursor-pointer mb-1">
                    <input
                      type="checkbox"
                      checked={check.estado}
                      onChange={() => toggleCheckItem(check.item)}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="text-xs leading-tight">{check.item}</span>
                  </label>
                  {check.estado && (
                    <input
                      type="text"
                      className="w-full px-2 py-1 rounded text-black text-xs mt-1 uppercase"
                      placeholder="Obs..."
                      value={check.obs}
                      onChange={e => updateCheckObs(check.item, e.target.value.toUpperCase())}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Tipo de Servicio</label>
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-900 rounded border border-gray-700">
              {SERVICIOS_CHECKBOX.map(serv => (
                <div key={serv} className="bg-gray-800 rounded">
                  <label className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-750 transition-colors">
                    <input
                      type="checkbox"
                      checked={servicios.includes(serv)}
                      onChange={() => toggleServicio(serv)}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="text-xs leading-tight">{serv}</span>
                  </label>

                  {servicios.includes(serv) && (
                    <div className="px-2 pb-2 animate-in slide-in-from-top duration-200">
                      <input
                        type="text"
                        placeholder="OBS..."
                        value={obsServicios[serv] || ''}
                        onChange={(e) => setObsServicios({
                         ...obsServicios,
                          [serv]: e.target.value.toUpperCase()
                        })}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Buscar Repuesto del Inventario</label>
            <input type="text" className="w-full px-3 py-2 rounded text-black text-sm uppercase" placeholder="BUSCAR POR SKU O NOMBRE..." value={busquedaRepuesto} onChange={e => setBusquedaRepuesto(e.target.value.toUpperCase())} />
            {repuestosDisponibles.length > 0 && (
              <div className="bg-gray-900 rounded border border-gray-700 max-h-40 overflow-y-auto mt-2">
                {repuestosDisponibles.map(p => (
                  <button key={p.id} type="button" onClick={() => agregarRepuestoInventario(p)} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm border-b border-gray-700 last:border-0">
                    <div className="font-bold">{p.sku} - {p.nombre}</div>
                    <div className="text-xs text-gray-400">STOCK: {p.stock_local} | {formatearPrecio(p.precio_venta)} C/IVA</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Detalle Repuestos y Mano de Obra</label>
            <div className="text-xs text-yellow-400 mb-2">* Todos los valores unitarios deben incluir IVA | Items de inventario no se pueden modificar</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-600 ">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="border border-gray-600 p-2 text-left">DESCRIPCIÓN</th>
                    <th className="border border-gray-600 p-2 text-center w-20">CANT</th>
                    <th className="border border-gray-600 p-2 text-right w-32">VALOR UNIT</th>
                    <th className="border border-gray-600 p-2 text-right w-32">VALOR TOTAL</th>
                    <th className="border border-gray-600 p-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-red-600 text-white font-bold">
                    <td colSpan="1" className="border border-gray-600 p-1">REPUESTOS UTILIZADOS</td>
                  </tr>
                  {itemsTabla.filter(i => i.tipo === 'REPUESTO').map(item => (
  <tr key={item.id} className="bg-gray-800">
    <td className="border border-gray-600 p-1">
      <input
        type="text"
        className="w-full px-2 py-1 rounded text-black text-xs uppercase"
        value={item.descripcion}
        onChange={e => actualizarItem(item.id, 'descripcion', e.target.value)}
        placeholder="DESCRIPCIÓN REPUESTO..."
        disabled={item.esDesdeBD} // ← YA TIENES ESTO
      />
    </td>
    
    {/* ESTE ES EL QUE TIENES QUE CAMBIAR ↓ */}
    <td className="border border-gray-600 p-1">
      <input
  type="number"
  className={`w-full px-2 py-1 rounded text-black text-xs text-center ${
    item.retiro_id ? 'bg-gray-600 cursor-not-allowed' : ''
  }`}
  value={item.cantidad}
  onChange={e => actualizarItem(item.id, 'cantidad', e.target.value)}
  disabled={!!item.retiro_id} // ← SOLO SI TIENE retiro_id
  min="1"
/>
    </td>
    
    {/* Y ESTE TAMBIÉN ↓ */}
    <td className="border border-gray-600 p-1">
      <input
        type="number"
        className={`w-full px-2 py-1 rounded text-black text-xs text-right ${item.esDesdeBD? 'bg-gray-300 cursor-not-allowed' : ''}`}
        value={item.valor_unit}
        onChange={e => actualizarItem(item.id, 'valor_unit', e.target.value)}
        placeholder="C/IVA"
        disabled={!!item.retiro_id}
        title={item.esDesdeBD? 'Precio de inventario no editable' : ''}
      />
    </td>
    
    <td className="border border-gray-600 p-2 text-right text-xs font-bold">
      {formatearPrecio(item.cantidad * item.valor_unit)}
    </td>
    
    {/* BOTÓN ELIMINAR - ESTE TAMBIÉN ↓ */}
    <td className="border border-gray-600 p-1 text-center">
      <button 
  type="button" 
  onClick={() => eliminarItem(item.id)} 
  disabled={!!item.retiro_id} // ← SOLO BLOQUEA SI TIENE retiro_id
  className={`w-8 h-8 rounded flex items-center justify-center ${
    item.retiro_id 
      ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
      : 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white'
  }`}
  title={item.retiro_id ? 'No se puede eliminar: viene de retiro' : 'Eliminar'}
>
  {item.retiro_id ? '🔒' : '🗑'}
</button>
    </td>
  </tr>
))}
                  <tr>
                    <td colSpan="5" className="border border-gray-600 p-1">
                      <button type="button" onClick={() => agregarFila('REPUESTO')} className="px-3 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700">+ AGREGAR REPUESTO</button>
                    </td>
                  </tr>

                  <tr className="bg-red-600 text-white font-bold">
                    <td colSpan="1" className="border border-gray-600 p-1">MANO DE OBRA H/H</td>
                  </tr>
                  {itemsTabla.filter(i => i.tipo === 'MANO_OBRA').map(item => (
                    <tr key={item.id} className="bg-gray-800">
                      <td className="border border-gray-600 p-1">
                        <input
                          type="text"
                          className="w-full px-2 py-1 rounded text-black text-xs uppercase"
                          value={item.descripcion}
                          onChange={e => actualizarItem(item.id, 'descripcion', e.target.value)}
                          placeholder="DESCRIPCIÓN MANO DE OBRA..."
                        />
                      </td>
                      <td className="border border-gray-600 p-1">
                        <input
                          type="number"
                          className="w-full px-2 py-1 rounded text-black text-xs text-center"
                          value={item.cantidad}
                          onChange={e => actualizarItem(item.id, 'cantidad', e.target.value)}
                          min="1"
                        />
                      </td>
                      <td className="border border-gray-600 p-1">
                        <input
                          type="number"
                          className="w-full px-2 py-1 rounded text-black text-xs text-right"
                          value={item.valor_unit}
                          onChange={e => actualizarItem(item.id, 'valor_unit', e.target.value)}
                          placeholder="C/IVA"
                        />
                      </td>
                      <td className="border border-gray-600 p-2 text-right text-xs font-bold">
                        {formatearPrecio(item.cantidad * item.valor_unit)}
                      </td>
                      <td className="border border-gray-600 p-1 text-center">
                        <button type="button" onClick={() => eliminarItem(item.id)} className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700">🗑</button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan="5" className="border border-gray-600 p-1">
                      <button type="button" onClick={() => agregarFila('MANO_OBRA')} className="px-3 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700">+ AGREGAR MANO DE OBRA</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-start mt-4">
              <div className="flex flex-col items-start gap-3 w-64">
                <img src="/BN.png" alt="Logo BN" className="h-20 object-contain" />
              </div>

              <div className="w-80 bg-gray-900 border border-gray-600 rounded">
                <div className="flex justify-between p-1 border-b border-gray-600">
                  <span className="font-bold">NETO</span>
                  <span className="font-bold">{formatearPrecio(neto)}</span>
                </div>
                <div className="flex justify-between p-1 border-b border-gray-600">
                  <span className="font-bold">IVA 19%</span>
                  <span className="font-bold">{formatearPrecio(iva)}</span>
                </div>
                <div className="flex justify-between p-1 bg-black text-white font-bold text-lg">
                  <span>TOTAL</span>
                  <span>{formatearPrecio(total)}</span>
                </div>
                <div className="flex justify-between items-center p-1 bg-green-900">
                  <span className="font-bold">ABONO</span>
                  <input
                    type="number"
                    value={abono}
                    max={total}
                    onChange={(e) => {
                      const valor = Number(e.target.value);
                      if (valor > total) {
                        setMensaje({ tipo: 'error', texto: 'El abono no puede ser mayor al total' });
                        setTimeout(() => setMensaje(null), 3000);
                        setAbono(total);
                      } else if (valor < 0) {
                        setAbono(0);
                      } else {
                        setAbono(valor);
                      }
                    }}
                    className="w-24 text-right bg-white text-black rounded px-2"
                  />
                </div>
                {abono > 0 && (
                  <div className="flex justify-between p-2 bg-blue-900 font-bold text-lg">
                    <span>SALDO</span>
                    <span>{formatearPrecio(saldo)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Descripción / Observaciones</label>
            <textarea className="w-full px-3 py-2 rounded text-black text-sm uppercase" rows="3" placeholder="DETALLA EL TRABAJO A REALIZAR, SÍNTOMAS, ETC..." value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-bold mb-2">Estado OT</label>
              <div className={`w-full px-3 py-2 rounded text-white text-sm font-bold border ${
                estadoOT === 'Entregado'? 'bg-green-700 border-green-500' :
                estadoOT === 'Finalizado'? 'bg-blue-700 border-blue-500' :
                estadoOT === 'Esperando Repuesto'? 'bg-yellow-700 border-yellow-500' :
                estadoOT === 'En Proceso'? 'bg-cyan-700 border-cyan-500' :
                'bg-gray-700 border-gray-600'
              }`}>
                {estadoOT || 'Pendiente'}
              </div>
            </div>
          </div>

          <button 
  type="submit" 
  disabled={guardando}
  className={`w-full px-4 py-2 rounded font-bold text-lg transition-all ${
    guardando 
      ? 'bg-gray-600 cursor-not-allowed' 
      : 'bg-green-600 hover:bg-green-700 hover:scale-[1.02]'
  }`}
>
  {guardando ? (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
      GUARDANDO...
    </span>
  ) : (
    otExistente && otExistente.id ? '💾 ACTUALIZAR ORDEN DE TRABAJO' : '💾 CREAR ORDEN DE TRABAJO'
  )}
</button>
        </form>
      </div>
    </div>
  );
}


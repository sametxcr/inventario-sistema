import { useState, useEffect } from 'react';
import { useRefresh } from '../components/RefreshContext';
import { api } from '../api';
import ClienteForm from './ClienteForm';
import ClienteHistorialModal from './ClienteHistorialModal';

export default function ClientesTab({ setMensaje }) {
  const [clientes, setClientes] = useState([]);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [rutHistorial, setRutHistorial] = useState(null);
  const { refreshKey } = useRefresh();

const cargarClientes = async () => {
	try {
  const [todos, ots] = await Promise.all([
    api.get('clientes'),
    api.get('ordenes_trabajo')
  ]);

  const agrupados = Object.values(
    todos.reduce((acc, c) => {
      if (!acc[c.rut]) {
        acc[c.rut] = {
          rut: c.rut,
          nombre: c.nombre,
          celular: c.celular,
          email: c.email || '', // ← AGREGADO
          tipo_cliente: c.tipo_cliente || 'natural',
          razon_social: c.razon_social || '',
          giro: c.giro || '', // ← AGREGADO
          direccion_facturacion: c.direccion_facturacion || '', // ← AGREGADO
          correo_facturacion: c.correo_facturacion || '', // ← AGREGADO
          vehiculos: [],
          ultimoIngreso: c.ultimo_ingreso,
          totalVehiculos: 0,
          otsActivas: 0
        };
      }
      acc[c.rut].vehiculos.push({
        id: c.id,
        patente: c.patente,
        marca: c.marca,
        modelo: c.modelo,
        anio: c.anio || null,
        vin: c.vin || '' // ← AGREGADO
      });
      acc[c.rut].totalVehiculos++;

      if (c.ultimo_ingreso && (!acc[c.rut].ultimoIngreso || new Date(c.ultimo_ingreso) > new Date(acc[c.rut].ultimoIngreso))) {
        acc[c.rut].ultimoIngreso = c.ultimo_ingreso;
      }

      // Actualiza datos del cliente si viene más completo
      if (c.nombre && c.nombre!== acc[c.rut].nombre) {
        acc[c.rut].nombre = c.nombre;
      }
      if (c.celular && c.celular!== acc[c.rut].celular) {
        acc[c.rut].celular = c.celular;
      }
      if (c.email && c.email!== acc[c.rut].email) {
        acc[c.rut].email = c.email; // ← AGREGADO
      }
      if (c.tipo_cliente && c.tipo_cliente!== acc[c.rut].tipo_cliente) {
        acc[c.rut].tipo_cliente = c.tipo_cliente;
      }
      if (c.razon_social && c.razon_social!== acc[c.rut].razon_social) {
        acc[c.rut].razon_social = c.razon_social;
      }
      if (c.giro && c.giro!== acc[c.rut].giro) {
        acc[c.rut].giro = c.giro; // ← AGREGADO
      }
      if (c.direccion_facturacion && c.direccion_facturacion!== acc[c.rut].direccion_facturacion) {
        acc[c.rut].direccion_facturacion = c.direccion_facturacion; // ← AGREGADO
      }
      if (c.correo_facturacion && c.correo_facturacion!== acc[c.rut].correo_facturacion) {
        acc[c.rut].correo_facturacion = c.correo_facturacion; // ← AGREGADO
      }
      return acc;
    }, {})
  );

  agrupados.forEach(cliente => {
    const otsCliente = ots.filter(ot => ot.rut_cliente === cliente.rut);
    const activas = otsCliente.filter(ot =>
      ot.estado_ot!== 'Entregado' && ot.estado_ot!== 'Cancelado'
    );
    cliente.otsActivas = activas.length;
  });

  let clientesArray = agrupados;

  clientesArray.sort((a, b) => {
    if (a.otsActivas > 0 && b.otsActivas === 0) return -1;
    if (a.otsActivas === 0 && b.otsActivas > 0) return 1;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  if (busqueda.trim()) {
    const b = busqueda.toLowerCase();
    clientesArray = clientesArray.filter(c =>
      c.nombre.toLowerCase().includes(b) ||
      c.rut.toLowerCase().includes(b) ||
      c.razon_social.toLowerCase().includes(b) ||
      c.vehiculos.some(v => v.patente.toLowerCase().includes(b))
    );
  }

   setClientes(clientesArray);
  } catch (err) { // ← AGREGA ESTO
    setMensaje('Error al cargar clientes: ' + err.message, 'error'); // ← AGREGA ESTO
  }
};

  useEffect(() => {
    cargarClientes();
  }, [busqueda, refreshKey]);

const handleEditarCliente = (cliente) => {
  const primerVehiculo = cliente.vehiculos[0];
  if (!primerVehiculo) return;

  setClienteEditando({
    id: primerVehiculo.id,
    rut: cliente.rut,
    nombre: cliente.nombre,
    celular: cliente.celular || '',
    email: cliente.email || '', // ← AGREGADO
    tipo_cliente: cliente.tipo_cliente || 'natural',
    razon_social: cliente.razon_social || '',
    giro: cliente.giro || '', // ← AGREGADO
    direccion_facturacion: cliente.direccion_facturacion || '', // ← AGREGADO
    correo_facturacion: cliente.correo_facturacion || '', // ← AGREGADO
    patente: primerVehiculo.patente,
    marca: primerVehiculo.marca || '',
    modelo: primerVehiculo.modelo || '',
    anio: primerVehiculo.anio || '',
    vin: primerVehiculo.vin || '' // ← AGREGADO
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  const handleEliminarCliente = async (rut, nombre) => {
    const totalVehiculos = clientes.find(c => c.rut === rut)?.totalVehiculos || 0;
    if (!window.confirm(`¿Eliminar todos los vehículos de ${nombre}? Esto borrará ${totalVehiculos} registros y sus OTs asociadas.`)) return;

    try {
      const ingresos = await api.get('clientes');
      const ingresosCliente = ingresos.filter(i => i.rut === rut);

      for (const ing of ingresosCliente) {
        await api.delete(`clientes/${ing.id}`);
      }

      const ots = await api.get('ordenes_trabajo');
      const otsCliente = ots.filter(o => o.rut_cliente === rut);

      for (const ot of otsCliente) {
        await api.delete(`ordenes_trabajo/${ot.id}`);
      }

      cargarClientes();
    } catch (err) {
    setMensaje('Error al eliminar: ' + err.message, 'error'); // ← CAMBIA EL ALERT POR ESTO
  }
  };

const handleGuardar = async () => {
  await cargarClientes();
  setMensaje('Cliente guardado correctamente', 'success'); // ← AGREGA ESTO
  setClienteEditando(null);
};

  return (
    <>
      <div className="p-4 bg-gray-800 flex gap-2 mx-4 mt-4 rounded border border-gray-700 flex-wrap items-center">
        <input
          placeholder="Buscar nombre, patente o RUT..."
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none flex-1 min-w-0"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <ClienteForm
  clienteEditando={clienteEditando}
  onGuardar={handleGuardar}
  onLimpiar={() => setClienteEditando(null)}
  setMensaje={setMensaje} // ← AGREGA ESTA LÍNEA
/>

      <div className="mx-4 mb-4 bg-gray-800 rounded border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700">
            <tr>
              <th className="text-left p-2">Cliente</th>
              <th className="text-left p-2">Contacto</th>
              <th className="text-center p-2">Vehículos</th>
              <th className="text-center p-2">OT Activa</th>
              <th className="text-center p-2">Último Ingreso</th>
              <th className="text-center p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.rut} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="p-2">
                  <button
    onClick={() => setRutHistorial(c.rut)}
    className="text-left hover:text-cyan-400 transition-colors"
    title="Ver ficha completa del cliente"
  >
    {c.tipo_cliente === 'empresa' ? (
      <>
        <div className="font-bold uppercase underline flex items-center gap-1">
          <span className="text-blue-400">🏢</span>
          {c.razon_social || c.nombre}
        </div>
        <div className="text-xs">
          <span className="text-yellow-400">contacto: </span>
          <span className="text-white">{c.nombre}</span>
        </div>
        <div className="text-xs text-gray-400">{c.rut}</div>
        {c.giro && (
          <div className="text-xs text-cyan-400 mt-0.5">
            {c.giro}
          </div>
        )}
      </>
    ) : (
      <>
        <div className="font-bold underline flex items-center gap-1">
          <span className="text-green-400">👤</span>
          {c.nombre}
        </div>
        <div className="text-xs text-gray-400">{c.rut}</div>
      </>
    )}
  </button>
                </td>
                <td className="p-2 text-xs">{c.celular || '-'}</td>
                <td className="text-center p-2">
                  <span className="px-2 py-1 bg-slate-600 rounded font-bold">
                    {c.totalVehiculos} {c.totalVehiculos === 1? 'vehículo' : 'vehículos'}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {c.vehiculos.slice(0, 2).map(v => `${v.patente}${v.anio? ` (${v.anio})` : ''}`).join(', ')}
                    {c.totalVehiculos > 2 && '...'}
                  </div>
                </td>
                <td className="text-center p-2">
                  {c.otsActivas > 0? (
                    <span className="px-2 py-1 bg-red-600 rounded font-bold text-xs">
                      {c.otsActivas} EN TALLER
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
                <td className="text-center p-2 text-xs">
                  {c.ultimoIngreso? new Date(c.ultimoIngreso).toLocaleDateString('es-CL') : '-'}
                </td>
                <td className="text-center p-2">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => handleEditarCliente(c)}
                      className="px-2 py-1 bg-orange-600 rounded text-xs font-bold hover:bg-orange-700"
                      title="Editar datos cliente"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => setRutHistorial(c.rut)}
                      className="px-2 py-1 bg-blue-600 rounded text-xs font-bold hover:bg-blue-700"
                      title="Ver ficha"
                    >
                      📋 Ficha
                    </button>
                    <button
                      onClick={() => handleEliminarCliente(c.rut, c.tipo_cliente === 'empresa'? c.razon_social : c.nombre)}
                      className="px-2 py-1 bg-red-600 rounded text-xs font-bold hover:bg-red-700"
                      title="Eliminar cliente y todos sus vehículos"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clientes.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            {busqueda? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </div>
        )}
      </div>

      {rutHistorial && (
        <ClienteHistorialModal
          rut={rutHistorial}
          onCerrar={() => setRutHistorial(null)}
          setMensaje={setMensaje}
        />
      )}
    </>
  );
}
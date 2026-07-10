import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatearRut, validarRut, limpiarRut } from '../utils/rut';

export default function ClienteForm({ clienteEditando, rutPrellenado, onGuardar, onLimpiar, modoVehiculo = false, setMensaje }) {

  const [form, setForm] = useState({
    nombre: '',
    rut: '',
    celular: '',
    marca: '',
    modelo: '',
    patente: '',
    anio: '',
    tipo_cliente: 'natural',
    razon_social: '',
    giro: '',
    direccion_facturacion: '',
    correo_facturacion: ''
  });
  const [errorRut, setErrorRut] = useState('');
  const [errorPatente, setErrorPatente] = useState('');
  const [clienteExistente, setClienteExistente] = useState(null);
  const [buscandoRUT, setBuscandoRUT] = useState(false);

  useEffect(() => {
    if (clienteEditando) {
      setForm({
        nombre: clienteEditando.nombre,
        rut: clienteEditando.rut? formatearRut(clienteEditando.rut) : '',
        celular: clienteEditando.celular || '',
        marca: clienteEditando.marca || '',
        modelo: clienteEditando.modelo || '',
        patente: clienteEditando.patente || '',
        anio: clienteEditando.anio || '',
        tipo_cliente: clienteEditando.tipo_cliente || 'natural',
        razon_social: clienteEditando.razon_social || '',
        giro: clienteEditando.giro || '',
        direccion_facturacion: clienteEditando.direccion_facturacion || '',
        correo_facturacion: clienteEditando.correo_facturacion || ''
      });
      setClienteExistente(null);
      setErrorRut('');
      setErrorPatente('');
    } else if (rutPrellenado) {
      buscarClientePorRUT(rutPrellenado);
    } else {
      resetearCampos();
    }
  }, [clienteEditando, rutPrellenado]);

  const buscarClientePorRUT = async (rut) => {
    setBuscandoRUT(true);
    const rutLimpio = limpiarRut(rut);
    const clientesConRUT = await api.get('clientes');
    const cliente = clientesConRUT.find(c => c.rut === rutLimpio);

    if (cliente) {
      setClienteExistente(cliente);
      setForm({
        nombre: cliente.nombre,
        rut: formatearRut(cliente.rut),
        celular: cliente.celular || '',
        marca: '',
        modelo: '',
        patente: '',
        anio: '',
        tipo_cliente: cliente.tipo_cliente || 'natural',
        razon_social: cliente.razon_social || '',
        giro: cliente.giro || '',
        direccion_facturacion: cliente.direccion_facturacion || '',
        correo_facturacion: cliente.correo_facturacion || ''
      });
    }
    setBuscandoRUT(false);
  };

  const handleRutChange = (e) => {
    const valorFormateado = formatearRut(e.target.value);
    setForm({...form, rut: valorFormateado});
    setErrorRut('');
  };

  const handleRutBlur = async () => {
    if (!form.rut.trim() || clienteEditando) return;

    if (!validarRut(form.rut)) {
      setErrorRut('RUT inválido');
      return;
    }

    setErrorRut('');
    await buscarClientePorRUT(form.rut);
  };

  const handlePatenteBlur = async () => {
    if (!form.patente.trim() || clienteEditando) return;

    const patenteUpper = form.patente.trim().toUpperCase();
    const clientes = await api.get('clientes');
    const patenteExistente = clientes.find(c => c.patente === patenteUpper);

    if (patenteExistente) {
      setErrorPatente(`❌ Patente ya registrada con: ${patenteExistente.nombre} (RUT: ${patenteExistente.rut})`);
    } else {
      setErrorPatente('');
    }
  };

  const resetearCampos = () => {
    setForm({
      nombre: '',
      rut: '',
      celular: '',
      marca: '',
      modelo: '',
      patente: '',
      anio: '',
      tipo_cliente: 'natural',
      razon_social: '',
      giro: '',
      direccion_facturacion: '',
      correo_facturacion: ''
    });
    setClienteExistente(null);
    setErrorRut('');
    setErrorPatente('');
  };

  const limpiarForm = () => {
    resetearCampos();
    onLimpiar();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombre.trim() ||!form.patente.trim()) {
      setMensaje('Nombre y Patente son obligatorios', 'warning');
	  return;
    }

    if (form.rut.trim() &&!validarRut(form.rut)) {
      setMensaje('El RUT ingresado no es válido', 'error');
      setErrorRut('RUT inválido');
      return;
    }

    if (form.tipo_cliente === 'empresa' &&!form.razon_social.trim()) {
      setMensaje('Razón Social es obligatoria para empresas', 'warning');
      return;
    }

    const rutLimpio = form.rut.trim()? limpiarRut(form.rut) : null;
    const patenteUpper = form.patente.trim().toUpperCase();

	      // VALIDACIÓN RUT DUPLICADO - SOLO SI TIENE RUT <- PEGA ESTO COMPLETO
    if (rutLimpio &&!clienteEditando?.id) {
      const clientes = await api.get('clientes');
      const rutExiste = clientes.find(c => 
        c.rut && limpiarRut(c.rut) === rutLimpio
      );

      if (rutExiste) {
        setMensaje(`RUT ${form.rut} ya registrado: ${rutExiste.nombre}`, 'error');
        setErrorRut(`❌ Ya existe`);
        return;
      }
    }

    // SI ESTÁ EDITANDO Y CAMBIÓ EL RUT, VALIDA TAMBIÉN
    if (rutLimpio && clienteEditando?.id && rutLimpio!== limpiarRut(clienteEditando.rut)) {
      const clientes = await api.get('clientes');
      const rutExiste = clientes.find(c => 
        c.rut && limpiarRut(c.rut) === rutLimpio && c.id!== clienteEditando.id
      );

      if (rutExiste) {
        setMensaje(`RUT ${form.rut} ya pertenece a: ${rutExiste.nombre}`, 'error');
        setErrorRut(`❌ Ya existe`);
        return;
      }
    }
    // FIN DEL BLOQUE NUEVO
	  
    if (!clienteEditando?.id) {
      const clientes = await api.get('clientes');
      const patenteExistente = clientes.find(c => c.patente === patenteUpper);

      if (patenteExistente) {
       setMensaje(`La patente ${patenteUpper} ya está registrada con: ${patenteExistente.nombre} (${patenteExistente.rut})`, 'error');
        setErrorPatente(`❌ Ya pertenece a ${patenteExistente.nombre}`);
        return;
      }
    }

    if (clienteEditando?.id && patenteUpper!== clienteEditando.patente) {
      const clientes = await api.get('clientes');
      const patenteExistente = clientes.find(c => c.patente === patenteUpper);

      if (patenteExistente && patenteExistente.id!== clienteEditando.id) {
       setMensaje(`La patente ${patenteUpper} ya está registrada con otro cliente: ${patenteExistente.nombre}`, 'error');
        setErrorPatente(`❌ Ya pertenece a ${patenteExistente.nombre}`);
        return;
      }
    }

    const datosVehiculo = {
      nombre: form.nombre.trim().toUpperCase(),
      rut: rutLimpio,
      celular: form.celular.trim(),
      marca: form.marca.trim().toUpperCase(),
      modelo: form.modelo.trim().toUpperCase(),
      patente: patenteUpper,
      anio: form.anio? parseInt(form.anio) : null,
      tipo_cliente: form.tipo_cliente,
      razon_social: form.tipo_cliente === 'empresa'? form.razon_social.trim().toUpperCase() : '',
      giro: form.tipo_cliente === 'empresa'? form.giro.trim().toUpperCase() : '',
      direccion_facturacion: form.tipo_cliente === 'empresa'? form.direccion_facturacion.trim().toUpperCase() : '',
      correo_facturacion: form.tipo_cliente === 'empresa'? form.correo_facturacion.trim().toLowerCase() : '',
      email: clienteEditando?.email || '',
      vin: clienteEditando?.vin || '',
      fecha_recepcion: clienteEditando?.fecha_recepcion || new Date().toISOString().split('T')[0],
      observaciones: clienteEditando?.observaciones || ''
    };

    try {
      if (clienteEditando?.id) {
        const rutAnterior = clienteEditando.rut;
        const nombreCambio = datosVehiculo.nombre!== clienteEditando.nombre;
        const celularCambio = datosVehiculo.celular!== clienteEditando.celular;
        const rutCambio = datosVehiculo.rut!== clienteEditando.rut;
        const tipoCambio = datosVehiculo.tipo_cliente!== clienteEditando.tipo_cliente;
        const razonSocialCambio = datosVehiculo.razon_social!== (clienteEditando.razon_social || '');
        const giroCambio = datosVehiculo.giro!== (clienteEditando.giro || '');
        const direccionCambio = datosVehiculo.direccion_facturacion!== (clienteEditando.direccion_facturacion || '');
        const correoCambio = datosVehiculo.correo_facturacion!== (clienteEditando.correo_facturacion || '');

        if (nombreCambio || celularCambio || rutCambio || tipoCambio || razonSocialCambio || giroCambio || direccionCambio || correoCambio) {
          const todos = await api.get('clientes');
          const delMismoRut = todos.filter(c => c.rut === rutAnterior);

          for (const reg of delMismoRut) {
            await api.put(`clientes/${reg.id}`, {
             ...reg,
              nombre: datosVehiculo.nombre,
              celular: datosVehiculo.celular,
              rut: datosVehiculo.rut,
              tipo_cliente: datosVehiculo.tipo_cliente,
              razon_social: datosVehiculo.razon_social,
              giro: datosVehiculo.giro,
              direccion_facturacion: datosVehiculo.direccion_facturacion,
              correo_facturacion: datosVehiculo.correo_facturacion
            });
          }

          await api.put(`clientes/${clienteEditando.id}`, datosVehiculo);
        } else {
          await api.put(`clientes/${clienteEditando.id}`, datosVehiculo);
        }
      } else {
        await api.post('clientes', datosVehiculo);
      }

      resetearCampos();
      onGuardar();
	  setMensaje('Cliente guardado correctamente', 'success'); // ← AGREGA ESTO
    } catch (err) {
      console.error(err);
      setMensaje(err.message || 'Error al guardar cliente', 'error');
    }
  };

  return (
    <div className="mx-4 mb-3 p-3 bg-gray-800 rounded border border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">
          {modoVehiculo && clienteEditando? 'Editar Vehículo' : modoVehiculo? 'Nuevo Vehículo' : clienteEditando? 'Editar Cliente' : clienteExistente? 'Agregar Vehículo a Cliente Existente' : 'Nuevo Cliente/Vehículo'}
        </h2>

        <div className="flex gap-2 bg-gray-700 p-1 rounded">
          <button
            type="button"
            onClick={() => setForm({...form, tipo_cliente: 'natural'})}
            disabled={!!clienteExistente || modoVehiculo}
            className={`px-3 py-1 rounded text-xs font-bold transition ${
              form.tipo_cliente === 'natural'
             ? 'bg-cyan-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            👤 Persona
          </button>
          <button
            type="button"
            onClick={() => setForm({...form, tipo_cliente: 'empresa'})}
            disabled={!!clienteExistente || modoVehiculo}
            className={`px-3 py-1 rounded text-xs font-bold transition ${
              form.tipo_cliente === 'empresa'
             ? 'bg-cyan-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            🏢 Empresa
          </button>
        </div>
      </div>

      {clienteExistente && (
        <div className="mb-3 p-2 bg-blue-900/30 border border-blue-600 rounded text-sm">
          ✅ Cliente encontrado: <strong>{clienteExistente.nombre}</strong> | {clienteExistente.celular}
          <br/>Solo completa los datos del nuevo vehículo
        </div>
      )}

      {modoVehiculo && clienteEditando && (
        <div className="mb-3 p-2 bg-blue-900/30 border border-blue-600 rounded text-sm">
          ✏ Editando vehículo: <strong>{clienteEditando?.patente}</strong> de {clienteEditando?.nombre}
          <br/><span className="text-xs text-gray-400">Solo puedes editar datos del vehículo. El dueño está bloqueado.</span>
        </div>
      )}

      {clienteEditando &&!modoVehiculo && (
        <div className="mb-3 p-2 bg-orange-900/30 border border-orange-600 rounded text-sm">
          ✏ Editando cliente: <strong>{clienteEditando.nombre}</strong>
          <br/><span className="text-xs text-gray-400">Solo puedes editar nombre, RUT y celular. Los datos del vehículo están bloqueados.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-5">
            <label className="block text-xs text-gray-400 mb-1">
              {form.tipo_cliente === 'empresa'? 'Nombre Contacto' : 'Nombre Cliente'} *
            </label>
            <input
              type="text"
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})}
              disabled={!!clienteExistente || modoVehiculo}
              required
            />
          </div>

          <div className="col-span-3">
            <label className="block text-xs text-gray-400 mb-1"> {form.tipo_cliente === 'empresa'? 'RUT Empresa' : 'RUT Persona'} {buscandoRUT && '⏳'} </label>
            <input
              type="text"
              className={`w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed ${errorRut? 'border-red-500 ring-1 ring-red-500' : ''}`}
              placeholder="12.345.678-9"
              value={form.rut}
              onChange={handleRutChange}
              onBlur={handleRutBlur}
              maxLength={12}
              disabled={!!clienteExistente || modoVehiculo}
            />
            {errorRut && (
              <p className="text-red-500 text-xs mt-1">{errorRut}</p>
            )}
          </div>

          <div className="col-span-4">
            <label className="block text-xs text-gray-400 mb-1">Celular Contacto</label>
            <input
              type="text"
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="+56 9 1234 5678"
              value={form.celular}
              onChange={e => setForm({...form, celular: e.target.value})}
              disabled={!!clienteExistente || modoVehiculo}
            />
          </div>
        </div>

        {form.tipo_cliente === 'empresa' && (
          <div className="p-2 bg-gray-700/50 border border-cyan-700 rounded">
            <p className="text-xs text-cyan-400 font-bold mb-2">📄 Datos Facturación Empresa</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Razón Social *</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="EMPRESA SPA"
                  value={form.razon_social}
                  onChange={e => setForm({...form, razon_social: e.target.value.toUpperCase()})}
                  disabled={!!clienteExistente || modoVehiculo}
                  required={form.tipo_cliente === 'empresa'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Giro</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="TALLER MECÁNICO"
                  value={form.giro}
                  onChange={e => setForm({...form, giro: e.target.value.toUpperCase()})}
                  disabled={!!clienteExistente || modoVehiculo}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Dirección Facturación</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="AV. SIEMPRE VIVA 123, CONCEPCIÓN"
                  value={form.direccion_facturacion}
                  onChange={e => setForm({...form, direccion_facturacion: e.target.value.toUpperCase()})}
                  disabled={!!clienteExistente || modoVehiculo}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo Facturación</label>
                <input
                  type="email"
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="facturacion@empresa.cl"
                  value={form.correo_facturacion}
                  onChange={e => setForm({...form, correo_facturacion: e.target.value.toLowerCase()})}
                  disabled={!!clienteExistente || modoVehiculo}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Patente *</label>
            <input
              type="text"
              className={`w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm font-bold uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed ${errorPatente? 'border-red-500 ring-1 ring-red-500' : ''}`}
              placeholder="ABCD12"
              value={form.patente}
              onChange={e => {
                setForm({...form, patente: e.target.value.toUpperCase()});
                setErrorPatente('');
              }}
              onBlur={handlePatenteBlur}
              required
              disabled={!!clienteEditando &&!modoVehiculo}
            />
            {errorPatente && (
              <p className="text-red-500 text-xs mt-1">{errorPatente}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Marca</label>
            <input
              type="text"
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
              value={form.marca}
              onChange={e => setForm({...form, marca: e.target.value.toUpperCase()})}
              disabled={!!clienteEditando &&!modoVehiculo}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Modelo</label>
            <input
              type="text"
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm uppercase disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
              value={form.modelo}
              onChange={e => setForm({...form, modelo: e.target.value.toUpperCase()})}
              disabled={!!clienteEditando &&!modoVehiculo}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Año</label>
            <input
              type="number"
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm disabled:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="2015"
              min="1950"
              max={new Date().getFullYear() + 1}
              value={form.anio}
              onChange={e => setForm({...form, anio: e.target.value})}
              disabled={!!clienteEditando &&!modoVehiculo}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetearCampos}
            className="px-4 py-1.5 bg-yellow-600 rounded font-bold text-sm hover:bg-yellow-700"
          >
            🧹 Limpiar
          </button>
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 bg-green-600 rounded font-bold text-sm hover:bg-green-700"
          >
            {modoVehiculo && clienteEditando? '💾 Actualizar Vehículo' : modoVehiculo? '➕ Guardar Vehículo' : clienteEditando? '💾 Actualizar Cliente' : clienteExistente? '➕ Agregar Vehículo' : '➕ Ingresar Vehículo'}
          </button>
          {(clienteEditando || clienteExistente) && (
            <button
              type="button"
              onClick={limpiarForm}
              className="px-4 py-1.5 bg-gray-600 rounded font-bold text-sm hover:bg-gray-700"
            >
              ❌ Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

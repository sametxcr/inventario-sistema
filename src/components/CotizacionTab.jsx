import { useState, useEffect } from 'react';
import { formatearPrecio } from '../utils/calculations';
import { FaEye, FaEdit, FaPlus, FaTrashAlt, FaPrint, FaSave } from 'react-icons/fa';

const CONFIG = {
  NOMBRE_EMPRESA: 'BALLADARES MOTORS',
  RUT_EMPRESA: '76.932.509-3'
};

const API_URL = import.meta.env.VITE_API_URL;

export default function CotizacionTab({ 
  listaCotizacion, 
  setListaCotizacion, 
  cotizacionEditando, 
  setCotizacionEditando, 
  modalCotizacion, 
  setModalCotizacion, 
  validezDias, 
  setValidezDias,
  setMensaje // ← AGREGA ESTO
}) {  
   
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProductos, setResultadosProductos] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  //const [validezDias, setValidezDias] = useState(15);
  const [guardando, setGuardando] = useState(false);
  const [cotizacionActual, setCotizacionActual] = useState(null);

  const [mostrarFormClienteNuevo, setMostrarFormClienteNuevo] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
  rut: '', nombre: '', celular: '', patente: '', marca: '', modelo: '', anio: ''
});
  const [errorPatente, setErrorPatente] = useState(null);
  const [validandoPatente, setValidandoPatente] = useState(false);

  // 👇 ESTE useEffect CARGA EL CLIENTE CUANDO VIENES DEL HISTORIAL
  useEffect(() => {
    if (modalCotizacion && modalCotizacion.id) {
      // Cargar datos del cliente
      setClienteSeleccionado({
        id: modalCotizacion.cliente_id,
        rut: modalCotizacion.rut_cliente,
        nombre: modalCotizacion.nombre_cliente,
        celular: modalCotizacion.celular,
        patente: modalCotizacion.patente,
        marca: modalCotizacion.marca,
        modelo: modalCotizacion.modelo,
        anio: modalCotizacion.anio
      });
      setBusquedaCliente(`${modalCotizacion.nombre_cliente} - ${modalCotizacion.patente}`);

      // Cargar otros campos
      setObservaciones(modalCotizacion.observaciones || '');
      //setValidezDias(modalCotizacion.validez_dias || 15);
      setCotizacionActual(modalCotizacion);
      setListaCotizacion(modalCotizacion.items || []);

      // Limpiar el modal pa que no se quede pegado
      setTimeout(() => setModalCotizacion(null), 100);
    }
  }, [modalCotizacion, setModalCotizacion, setListaCotizacion]);

useEffect(() => {
  const buscar = async () => {
    if (busquedaCliente.length < 2) {
      setResultadosClientes([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/clientes?search=${encodeURIComponent(busquedaCliente)}`);
      if (!res.ok) throw new Error('Error al buscar clientes');
      const clientes = await res.json();

      const texto = busquedaCliente.toLowerCase();
      const filtrados = clientes.filter(c =>
        (c.nombre && c.nombre.toLowerCase().includes(texto)) ||
        (c.razon_social && c.razon_social.toLowerCase().includes(texto)) ||
        (c.rut && c.rut.toLowerCase().includes(texto)) ||
        (c.patente && c.patente.toLowerCase().includes(texto))
      );

      setResultadosClientes(filtrados.slice(0, 5));
    } catch (err) {
      console.error('Error buscando clientes:', err);
      setResultadosClientes([]);
    }
  };
  buscar();
}, [busquedaCliente]);

  useEffect(() => {
    const validarPatente = async () => {
      const patente = nuevoCliente.patente.trim();
      if (patente.length < 3) {
        setErrorPatente(null);
        return;
      }
      setValidandoPatente(true);
      try {
        const res = await fetch(`${API_URL}/clientes/validar-patente/${encodeURIComponent(patente.toUpperCase())}`);
        const data = await res.json();
        if (data.existe) {
          setErrorPatente(`Patente ya registrada con: ${data.cliente.nombre} (RUT: ${data.cliente.rut})`);
        } else {
          setErrorPatente(null);
        }
      } catch (err) {
        setErrorPatente(null);
      } finally {
        setValidandoPatente(false);
      }
    };
    const timeout = setTimeout(validarPatente, 500);
    return () => clearTimeout(timeout);
  }, [nuevoCliente.patente]);

  useEffect(() => {
    const buscar = async () => {
      if (busquedaProducto.length < 2) {
        setResultadosProductos([]);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/productos?search=${encodeURIComponent(busquedaProducto)}`);
        if (!res.ok) throw new Error('Error al buscar productos');
        const productos = await res.json();
        setResultadosProductos(productos.slice(0, 8));
      } catch (err) {
        console.error('Error buscando productos:', err);
        setResultadosProductos([]);
      }
    };
    buscar();
  }, [busquedaProducto]);

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(`${cliente.nombre} - ${cliente.patente} (${cliente.marca} ${cliente.modelo})`);
    setResultadosClientes([]);
  };

  const limpiarCliente = () => {
    setClienteSeleccionado(null);
    setBusquedaCliente('');
  };

  const crearClienteNuevo = async () => {
    if (!nuevoCliente.rut.trim()) return setMensaje('El RUT es obligatorio', 'warning');
if (!nuevoCliente.nombre.trim()) return setMensaje('El Nombre es obligatorio', 'warning');
if (!nuevoCliente.patente.trim()) return setMensaje('La Patente es obligatoria', 'warning');
if (errorPatente) return setMensaje('La patente ya está registrada', 'error');


    try {
      const clienteData = {
  ...nuevoCliente,
  rut: nuevoCliente.rut.toUpperCase().trim(),
  nombre: nuevoCliente.nombre.toUpperCase().trim(),
  celular: nuevoCliente.celular.trim(),
  patente: nuevoCliente.patente.toUpperCase().trim(),
  marca: nuevoCliente.marca.toUpperCase().trim(),
  modelo: nuevoCliente.modelo.toUpperCase().trim(),
  anio: nuevoCliente.anio? parseInt(nuevoCliente.anio) : null // ✅ Ya está
};

      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear cliente');
      }

      const clienteCreado = await res.json();
      setClienteSeleccionado(clienteCreado);
      setBusquedaCliente(`${clienteCreado.nombre} - ${clienteCreado.patente}`);
      setMostrarFormClienteNuevo(false);
      setNuevoCliente({ rut: '', nombre: '', celular: '', patente: '', marca: '', modelo: '', anio: '' });
      setErrorPatente(null);
      setMensaje('Cliente creado', 'success');
} catch (err) {
  setMensaje('Error al crear cliente: ' + err.message, 'error');
    }
  };


const agregarProducto = (producto) => {
  console.log('PRODUCTO API:', producto); // Borra después de probar
  
  const yaExiste = listaCotizacion.find(p => p.id === producto.id);
  if (yaExiste) {
    setListaCotizacion(listaCotizacion.map(p =>
      p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
    ));
  } else {
    setListaCotizacion([...listaCotizacion, {
      ...producto,
      cantidad: 1,
      descuento: 0,
      precio_venta: Number(producto.precio_venta || producto.precio || producto.precio_costo) || 0,
      desde_inventario: true,
      tipo: 'repuesto'
    }]);
  }
  setBusquedaProducto('');
  setResultadosProductos([]);
};

  const agregarRepuesto = () => {
    const nuevo = {
      id: `MANUAL_${Date.now()}`,
      sku: 'MANUAL',
      nombre: '',
      precio_venta: 0,
      cantidad: 1,
      descuento: 0,
      desde_inventario: false,
      tipo: 'repuesto'
    };
    setListaCotizacion([...listaCotizacion, nuevo]);
  };

  const agregarManoObra = () => {
    const nuevo = {
      id: `MANUAL_${Date.now()}`,
      sku: 'MDO',
      nombre: '',
      precio_venta: 0,
      cantidad: 1,
      descuento: 0,
      desde_inventario: false,
      tipo: 'mano_obra'
    };
    setListaCotizacion([...listaCotizacion, nuevo]);
  };

  const actualizarRepuesto = (id, campo, valor) => {
    setListaCotizacion(listaCotizacion.map(p => {
      if (p.id === id) {
        if (campo === 'nombre') return {...p, nombre: valor.toUpperCase() };
        if (campo === 'sku') return {...p, sku: valor.toUpperCase() };
        if (campo === 'cantidad') return {...p, cantidad: Math.max(1, parseInt(valor) || 1) };
        if (campo === 'precio_venta') return {...p, precio_venta: Math.max(0, parseInt(valor) || 0) };
        if (campo === 'descuento') return {...p, descuento: Math.min(100, Math.max(0, parseFloat(valor) || 0)) };
      }
      return p;
    }));
  };

  const eliminarRepuesto = (id) => {
    setListaCotizacion(listaCotizacion.filter(p => p.id!== id));
  };

  const limpiarCotizacion = () => {
    if (window.confirm('¿Limpiar toda la cotización?')) {
      setListaCotizacion([]);
      setClienteSeleccionado(null);
      setBusquedaCliente('');
      setObservaciones('');
      setCotizacionEditando(null);
      setCotizacionActual(null);
    }
  };

  const repuestos = listaCotizacion.filter(p => p.tipo === 'repuesto');
  const manoObra = listaCotizacion.filter(p => p.tipo === 'mano_obra');

  const calcularSubtotal = () => {
    return listaCotizacion.reduce((sum, item) => {
      const valor = item.precio_venta;
      const subtotal = valor * item.cantidad * (1 - (item.descuento || 0) / 100);
      return sum + subtotal;
    }, 0);
  };

  const calcularIva = () => {
    return Math.round(calcularSubtotal() * 0.19);
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularIva();
  };

  const totalRepuestos = repuestos.reduce((sum, p) =>
    sum + (p.precio_venta * p.cantidad * (1 - p.descuento / 100)), 0
  );

  const totalManoObra = manoObra.reduce((sum, p) =>
    sum + (p.precio_venta * p.cantidad * (1 - (p.descuento || 0) / 100)), 0
  );

  const total = totalRepuestos + totalManoObra;
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  const calcularFechaValidez = (dias) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + parseInt(dias));
    return fecha.toLocaleDateString('es-CL');
  };

const guardarCotizacion = async () => {
  if (!clienteSeleccionado || listaCotizacion.length === 0) {
  setMensaje('Selecciona cliente y agrega productos', 'warning');
  return;
}


  setGuardando(true);

  try {
    const fechaValidez = new Date();
    fechaValidez.setDate(fechaValidez.getDate() + parseInt(validezDias));
    fechaValidez.setHours(12, 0, 0, 0);

    const payload = {
  rut_cliente: clienteSeleccionado.rut,
  patente: clienteSeleccionado.patente,
  items: listaCotizacion,
  total_repuestos: totalRepuestos,
  total_mano_obra: totalManoObra,
  subtotal_neto: neto,
  iva: iva,
  total: total,
  abono: 0,
  observaciones: observaciones,
  validez_hasta: fechaValidez.toISOString(),
  estado: 'Pendiente'
  // ❌ ELIMINA: cliente_id, nombre_cliente, marca, modelo, anio, celular
};

    const url = cotizacionEditando
? `${API_URL}/cotizaciones/${cotizacionEditando}`
      : `${API_URL}/cotizaciones`;

    const method = cotizacionEditando? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al guardar');
    }

    const data = await res.json();

    // ACTUALIZAR STATE CON EL ID NUEVO
    setCotizacionActual(data);
    setCotizacionEditando(data.id);

    setMensaje(`Cotización ${cotizacionEditando? 'actualizada' : 'guardada'} #${data.id}`, 'success');
} catch (err) {
  console.error('ERROR:', err);
  setMensaje(err.message, 'error');
} finally {
    setGuardando(false);
  }
};

  const imprimirCotizacion = () => {
 if (!clienteSeleccionado || listaCotizacion.length === 0) {
  setMensaje('Selecciona cliente y agrega productos', 'warning');
  return;
}
setMensaje('El navegador bloqueó la ventana emergente. Permite pop-ups', 'error');
setMensaje('Error al generar la cotización: ' + error.message, 'error');

  const repuestos = listaCotizacion.filter(p => p.tipo === 'repuesto');
  const manoObra = listaCotizacion.filter(p => p.tipo === 'mano_obra');

  const totalRepuestos = repuestos.reduce((sum, p) =>
    sum + (p.precio_venta * p.cantidad * (1 - p.descuento / 100)), 0
  );
  const totalManoObra = manoObra.reduce((sum, p) =>
    sum + (p.precio_venta * p.cantidad * (1 - (p.descuento || 0) / 100)), 0
  );
  const total = totalRepuestos + totalManoObra;
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  const fechaValidez = new Date();
  fechaValidez.setDate(fechaValidez.getDate() + parseInt(validezDias));
  fechaValidez.setHours(12, 0, 0, 0);
  const fechaHoy = new Date();

  const numCotiz = cotizacionActual?.id? `COT-${String(cotizacionActual.id).padStart(4, '0')}` : 'BORRADOR';

  try {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      setMensaje('El navegador bloqueó la ventana emergente. Permite pop-ups', 'error');
      return;
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cotización - ${clienteSeleccionado.patente}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            max-width: 850px;
            margin: 0 auto;
            font-size: 11px;
            color: #1f2937;
          }
  .header {
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: end;
            gap: 20px;
            border-bottom: 3px solid #dc2626;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
  .logo-img {
            height: 50px;
            width: 400px;
            object-fit: fill;
          }
  .cotizacion-box {
            text-align: right;
          }
  .cotizacion-titulo {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 4px;
          }
  .cotizacion-num {
            font-size: 16px;
            font-weight: 800;
            color: #dc2626;
            margin-bottom: 4px;
          }
   .cotizacion-num.borrador {
            color: #f59e0b;
          }
  .fecha-info {
            font-size: 9px;
            color: #6b7280;
            line-height: 1.4;
          }
  .info-cliente {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 12px;
            border-radius: 6px;
            margin: 12px 0;
            font-size: 12px;
            border-left: 4px solid #06b6d4;
          }
  .info-grid {
            display: grid;
            grid-template-columns: 80px 1fr 80px 1fr;
            gap: 4px 8px;
          }
  .info-label { font-weight: 600; color: #374151; }
  .info-value { color: #1f2937; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th {
            background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
            color: white;
            padding: 7px 8px;
            text-align: left;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
          }
          td {
            padding: 6px 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) { background: #f9fafb; }
  .total-box {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: white;
            padding: 14px;
            border-radius: 6px;
            margin-top: 15px;
            font-size: 11px;
          }
  .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
  .total-final {
            font-size: 17px;
            font-weight: 800;
            color: #10b981;
            border-top: 2px solid #10b981;
            padding-top: 8px;
            margin-top: 8px;
          }
  .section-title {
            background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 7px 10px;
            margin: 14px 0 6px 0;
            font-weight: 700;
            font-size: 10px;
            border-radius: 3px;
          }
  .condiciones {
            margin-top: 18px;
            padding: 12px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            font-size: 9px;
            line-height: 1.6;
          }
  .badge-ext {
            display: inline-block;
            background: #f59e0b;
            color: white;
            font-size: 7px;
            padding: 1px 4px;
            border-radius: 2px;
            margin-left: 4px;
            font-weight: 600;
          }
          @media print {
            button { display: none; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
          @page { margin: 1.5cm; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/BN.png" alt="Balladares Motors" class="logo-img" />
          <div class="cotizacion-box">
            <div class="cotizacion-titulo">COTIZACIÓN</div>
            <div class="cotizacion-num ${!cotizacionActual?.id? 'borrador' : ''}">${numCotiz}</div>
            <div class="fecha-info">
              Fecha: ${fechaHoy.toLocaleDateString('es-CL')}<br>
              Válida hasta: ${fechaValidez.toLocaleDateString('es-CL')}
            </div>
          </div>
        </div>

        <div class="info-cliente">
          <div class="info-grid">
            <span class="info-label">Nombre:</span>
            <span class="info-value">${clienteSeleccionado.nombre}</span>
            <span class="info-label">RUT:</span>
            <span class="info-value">${clienteSeleccionado.rut}</span>

            <span class="info-label">Celular:</span>
            <span class="info-value">${clienteSeleccionado.celular || 'N/A'}</span>
            <span class="info-label">Patente:</span>
            <span class="info-value"><strong>${clienteSeleccionado.patente}</strong></span>

            <span class="info-label">Vehículo:</span>
            <span class="info-value">${clienteSeleccionado.marca} ${clienteSeleccionado.modelo}</span>
            <span class="info-label">Año:</span>
            <span class="info-value">${clienteSeleccionado.anio || 'N/A'}</span>
          </div>
        </div>

        ${repuestos.length > 0? `
          <div class="section-title">REPUESTOS UTILIZADOS</div>
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">SKU</th>
                <th style="width: 40%;">Producto</th>
                <th style="text-align: center; width: 8%;">Cant.</th>
                <th style="text-align: right; width: 15%;">Precio c/IVA</th>
                <th style="text-align: center; width: 8%;">Desc.</th>
                <th style="text-align: right; width: 17%;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${repuestos.map(p => {
                const subtotal = Math.round(p.precio_venta * p.cantidad * (1 - p.descuento / 100));
                return `
                  <tr>
                    <td><strong style="color: #06b6d4;">${p.sku}</strong></td>
                    <td>${p.nombre} ${!p.desde_inventario? '<span class="badge-ext">EXT</span>' : ''}</td>
                    <td style="text-align: center;">${p.cantidad}</td>
                    <td style="text-align: right;">${formatearPrecio(p.precio_venta)}</td>
                    <td style="text-align: center;">${p.descuento}%</td>
                    <td style="text-align: right; font-weight: 700;">${formatearPrecio(subtotal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}

        ${manoObra.length > 0? `
          <div class="section-title">MANO DE OBRA H/H</div>
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">SKU</th>
                <th style="width: 40%;">Servicio</th>
                <th style="text-align: center; width: 8%;">Cant.</th>
                <th style="text-align: right; width: 15%;">Precio c/IVA</th>
                <th style="text-align: center; width: 8%;">Desc.</th>
                <th style="text-align: right; width: 17%;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${manoObra.map(p => {
                const subtotal = Math.round(p.precio_venta * p.cantidad * (1 - (p.descuento || 0) / 100));
                return `
                  <tr>
                    <td><strong style="color: #8b5cf6;">${p.sku}</strong></td>
                    <td>${p.nombre}</td>
                    <td style="text-align: center;">${p.cantidad}</td>
                    <td style="text-align: right;">${formatearPrecio(p.precio_venta)}</td>
                    <td style="text-align: center;">${p.descuento || 0}%</td>
                    <td style="text-align: right; font-weight: 700;">${formatearPrecio(subtotal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="total-box">
          ${totalRepuestos > 0? `
            <div class="total-row">
              <span>Repuestos (c/IVA):</span>
              <span>${formatearPrecio(totalRepuestos)}</span>
            </div>
          ` : ''}
          ${totalManoObra > 0? `
            <div class="total-row">
              <span>Mano de Obra (c/IVA):</span>
              <span>${formatearPrecio(totalManoObra)}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>NETO:</span>
            <span>${formatearPrecio(neto)}</span>
          </div>
          <div class="total-row">
            <span>IVA (19%):</span>
            <span>${formatearPrecio(iva)}</span>
          </div>
          <div class="total-row total-final">
            <span>TOTAL (IVA INCLUIDO):</span>
            <span>${formatearPrecio(total)}</span>
          </div>
        </div>

        ${observaciones? `
          <div class="info-cliente" style="margin-top: 12px; border-left-color: #8b5cf6;">
            <strong style="color: #374151;">Observaciones:</strong><br>
            <span style="color: #4b5563;">${observaciones}</span>
          </div>
        ` : ''}

        <div class="condiciones">
          <strong>⚠ CONDICIONES DE LA COTIZACIÓN:</strong><br>
          - Válida hasta el ${fechaValidez.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}<br>
          - Todos los precios incluyen IVA<br>
          - Precios sujetos a disponibilidad de stock<br>
          - Items marcados con <span class="badge-ext">EXT</span> son servicios/repuestos externos<br>
          - Una vez aprobada, se requiere 50% de abono para iniciar trabajos
        </div>

        <button onclick="window.print()" style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          🖨 Imprimir Cotización
        </button>
      </body>
      </html>
    `);
    ventana.document.close();
  } catch (error) {
    console.error('Error al generar cotización:', error);
    setMensaje('Error al generar la cotización: ' + error.message, 'error');

  }
};

  return (
    <div className="p-2">
      <div className="max-w-5xl mx-auto space-y-2">

        {/* HEADER COMPACTO */}
        <div className="bg-gray-800 p-2 rounded-lg border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-blue-400">Cotización</h2>
              {clienteSeleccionado && (
                <p className="text-xs text-green-400">
                  ✅ {clienteSeleccionado.marca} {clienteSeleccionado.modelo} - {clienteSeleccionado.patente}
                </p>
              )}
            </div>
            {listaCotizacion.length > 0 && (
              <button
                onClick={limpiarCotizacion}
                className="px-2 py-1 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-700"
              >
                🗑 Limpiar
              </button>
            )}
          </div>
        </div>

        {/* CLIENTE + PRODUCTO EN 1 FILA */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 relative">
            <label className="text-xs text-gray-400 block mb-1">Cliente:</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Nombre, patente, celular..."
                className="flex-1 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-sm"
              />
              <button
                onClick={() => setMostrarFormClienteNuevo(true)}
                className="px-2 py-1 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-700"
              >
                ➕
              </button>
              {clienteSeleccionado && (
                <button
                  onClick={limpiarCliente}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                >
                  ✕
                </button>
              )}
            </div>

            {resultadosClientes.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto left-0 right-0 shadow-lg">
                {resultadosClientes.map(c => (
  <div
    key={c.id}
    onClick={() => seleccionarCliente(c)}
    className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
  >
    <div className="flex justify-between items-center text-xs">
      <div className="flex-1">
        {c.tipo_cliente === 'empresa'? (
          <div>
            <div className="font-bold text-white">
              <span className="text-blue-400">🏢</span> {c.razon_social || c.nombre}
            </div>
            <div className="text-gray-400 text-xs">
              Contacto: {c.nombre} | {c.rut}
            </div>
          </div>
        ) : (
          <div>
            <div className="font-bold text-white">
              <span className="text-green-400">👤</span> {c.nombre}
            </div>
            <div className="text-gray-400 text-xs">{c.rut}</div>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-bold text-cyan-400">{c.patente}</div>
        <div className="text-gray-400">{c.marca} {c.modelo}</div>
      </div>
    </div>
  </div>
))}
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 relative">
            <label className="text-xs text-gray-400 block mb-1">Buscar producto:</label>
            <input
              type="text"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              placeholder="SKU o nombre..."
              className="w-full px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-sm"
            />

            {resultadosProductos.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto left-0 right-0 shadow-lg">
                {resultadosProductos.map(p => (
                  <div
                    key={p.id}
                    onClick={() => agregarProducto(p)}
                    className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                  >
                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="font-bold text-blue-400">{p.sku}</span>
                        <span className="text-white ml-1">{p.nombre}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">{formatearPrecio(p.precio_venta)}</div>
                        <div className="text-gray-400">Stock: {p.stock_local + p.stock_bodega}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FORM CLIENTE NUEVO COMPACTO */}
        {mostrarFormClienteNuevo && (
  <div className="bg-gray-800 p-2 rounded-lg border border-green-500">
    <h3 className="text-sm font-bold text-green-400 mb-2">➕ Cliente Nuevo</h3>
    <div className="grid grid-cols-4 gap-2">
      <input type="text" placeholder="RUT *" value={nuevoCliente.rut}
        onChange={(e) => setNuevoCliente({...nuevoCliente, rut: e.target.value.toUpperCase()})}
        className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
      <input type="text" placeholder="Nombre *" value={nuevoCliente.nombre}
        onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value.toUpperCase()})}
        className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
      <input type="text" placeholder="Celular" value={nuevoCliente.celular}
        onChange={(e) => setNuevoCliente({...nuevoCliente, celular: e.target.value})}
        className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
      <input type="text" placeholder="Patente *" value={nuevoCliente.patente}
        onChange={(e) => setNuevoCliente({...nuevoCliente, patente: e.target.value.toUpperCase()})}
        className={`px-2 py-1 rounded bg-gray-700 text-white border text-xs ${errorPatente? 'border-red-500' : 'border-gray-600'}`} />
      <input type="text" placeholder="Marca" value={nuevoCliente.marca}
        onChange={(e) => setNuevoCliente({...nuevoCliente, marca: e.target.value.toUpperCase()})}
        className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
      <input type="text" placeholder="Modelo" value={nuevoCliente.modelo}
        onChange={(e) => setNuevoCliente({...nuevoCliente, modelo: e.target.value.toUpperCase()})}
        className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
      <input type="number" placeholder="Año" value={nuevoCliente.anio}
        onChange={(e) => setNuevoCliente({...nuevoCliente, anio: e.target.value})}
        min="1950" max="2027"
        className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
      <div></div>
    </div>
    {errorPatente && <div className="text-xs text-red-400 mt-1">❌ {errorPatente}</div>}
    <div className="flex gap-2 mt-2">
      <button onClick={crearClienteNuevo} disabled={!!errorPatente || validandoPatente}
        className="flex-1 px-3 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-600 text-xs">
        {validandoPatente? '⏳ Validando...' : '✅ Crear'}
      </button>
     <button onClick={() => {setMostrarFormClienteNuevo(false); setErrorPatente(null);}}
        className="px-3 py-1 bg-gray-600 text-white rounded font-bold hover:bg-gray-700 text-xs">
        Cancelar
      </button>
    </div>
  </div>
)}

        {/* DETALLE COMPACTO */}
        <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-white">Detalle Repuestos y Mano de Obra</h3>
            <p className="text-xs text-orange-400">* Valores con IVA | Items inventario no modificables</p>
          </div>

          {/* REPUESTOS */}
          <div className="mb-3">
            <div className="bg-red-600 text-white font-bold py-0.5 px-2 mb-1 text-xs">REPUESTOS UTILIZADOS</div>
            <table className="w-full text-xs table-fixed">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-1 w-[40%]">DESCRIPCIÓN</th>
                  <th className="text-center p-1 w-[10%]">CANT</th>
                  <th className="text-right p-1 w-[20%]">VALOR UNIT</th>
                  <th className="text-right p-1 w-[20%]">VALOR TOTAL</th>
                  <th className="text-center p-1 w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                {repuestos.map((p) => {
                  const subtotal = p.precio_venta * p.cantidad * (1 - p.descuento / 100);
                  return (
                    <tr key={p.id} className="border-b border-gray-700">
                      <td className="p-1">
                        <input type="text" value={p.nombre}
                          onChange={(e) => actualizarRepuesto(p.id, 'nombre', e.target.value)}
                          disabled={p.desde_inventario}
                          className="w-full px-1 py-0.5 rounded bg-gray-700 text-white border border-gray-600 disabled:bg-gray-800 text-xs" />
                      </td>
                      <td className="p-1">
                        <div className="flex justify-center">
                          <input type="number" min="1" value={p.cantidad}
                            onChange={(e) => actualizarRepuesto(p.id, 'cantidad', e.target.value)}
                            className="w-12 px-1 py-0.5 rounded bg-gray-700 text-white text-center border border-gray-600 text-xs" />
                        </div>
                      </td>
                      <td className="p-1">
                        <div className="flex justify-end">
                          <input type="number" min="0" value={p.precio_venta}
                            onChange={(e) => actualizarRepuesto(p.id, 'precio_venta', e.target.value)}
                            disabled={p.desde_inventario}
                            className="w-20 px-1 py-0.5 rounded bg-gray-700 text-white text-right border border-gray-600 disabled:bg-gray-800 text-xs" />
                        </div>
                      </td>
                      <td className="p-1 text-right text-white font-bold">
                        {formatearPrecio(subtotal)}
                      </td>
                      <td className="p-1">
                        <div className="flex justify-center">
                          <button onClick={() => eliminarRepuesto(p.id)}
                            className="px-1 py-0.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700">
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={agregarRepuesto}
              className="mt-1 px-3 py-1 bg-blue-600 text-white rounded font-bold text-xs hover:bg-blue-700">
              + AGREGAR REPUESTO
            </button>
          </div>

          {/* MANO DE OBRA */}
          <div className="mb-3">
            <div className="bg-red-600 text-white font-bold py-0.5 px-2 mb-1 text-xs">MANO DE OBRA H/H</div>
            <table className="w-full text-xs table-fixed">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-1 w-[40%]">DESCRIPCIÓN</th>
                  <th className="text-center p-1 w-[10%]">CANT</th>
                  <th className="text-right p-1 w-[20%]">VALOR UNIT</th>
                  <th className="text-right p-1 w-[20%]">VALOR TOTAL</th>
                  <th className="text-center p-1 w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                {manoObra.map((p) => {
                  const subtotal = p.precio_venta * p.cantidad * (1 - (p.descuento || 0) / 100);
                  return (
                    <tr key={p.id} className="border-b border-gray-700">
                      <td className="p-1">
                        <input type="text" value={p.nombre}
                          onChange={(e) => actualizarRepuesto(p.id, 'nombre', e.target.value)}
                          className="w-full px-1 py-0.5 rounded bg-gray-700 text-white border border-gray-600 text-xs" />
                      </td>
                      <td className="p-1">
                        <div className="flex justify-center">
                          <input type="number" min="1" value={p.cantidad}
                            onChange={(e) => actualizarRepuesto(p.id, 'cantidad', e.target.value)}
                            className="w-12 px-1 py-0.5 rounded bg-gray-700 text-white text-center border border-gray-600 text-xs" />
                        </div>
                      </td>
                      <td className="p-1">
                        <div className="flex justify-end">
                          <input type="number" min="0" value={p.precio_venta}
                            onChange={(e) => actualizarRepuesto(p.id, 'precio_venta', e.target.value)}
                            className="w-20 px-1 py-0.5 rounded bg-gray-700 text-white text-right border border-gray-600 text-xs" />
                        </div>
                      </td>
                      <td className="p-1 text-right text-white font-bold">
                        {formatearPrecio(subtotal)}
                      </td>
                      <td className="p-1">
                        <div className="flex justify-center">
                          <button onClick={() => eliminarRepuesto(p.id)}
                            className="px-1 py-0.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700">
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={agregarManoObra}
              className="mt-1 px-3 py-1 bg-blue-600 text-white rounded font-bold text-xs hover:bg-blue-700">
              + AGREGAR MANO DE OBRA
            </button>
          </div>

          {/* TOTALES COMPACTOS + LOGO */}
          <div className="bg-gray-800 p-2 rounded-lg border border-gray-400 relative">
            <div className="flex justify-between items-center gap-4">
              
              {/* LOGO IZQUIERDA - ARREGLADO */}
              <div className="flex-1 relative z-0">
                <img
                  src="/BN.png"
                  alt="Balladares Motors"
                  className="w-1/2 h-20 object-fill opacity-800 pointer-events-none"
                />
              </div>

              {/* TOTALES DERECHA */}
              <div className="w-56 space-y-1 text-xs text-white relative z-10">
                {totalRepuestos > 0 && (
                  <div className="flex justify-between">
                    <span>Repuestos (c/IVA):</span>
                    <span className="font-bold">{formatearPrecio(totalRepuestos)}</span>
                  </div>
                )}
                {totalManoObra > 0 && (
                  <div className="flex justify-between">
                    <span>Mano de Obra (c/IVA):</span>
                    <span className="font-bold">{formatearPrecio(totalManoObra)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-600 pt-1">
                  <span>NETO:</span>
                  <span className="font-bold">{formatearPrecio(neto)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (19%):</span>
                  <span className="font-bold">{formatearPrecio(iva)}</span>
                </div>
                <div className="flex justify-between text-green-400 font-bold text-sm border-t border-gray-600 pt-1 mt-1">
                  <span>TOTAL (IVA INCLUIDO):</span>
                  <span>{formatearPrecio(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OBSERVACIONES + VALIDEZ */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Observaciones:</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles adicionales..."
                className="w-full px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs h-16 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Validez (días):</label>
              <input
                type="number"
                min="1"
                max="90"
                value={validezDias}
                onChange={(e) => setValidezDias(e.target.value)}
                className="w-full px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs"
              />
              <div className="text-xs text-gray-400 mt-1">
                Válida hasta: {(() => {
                  const fecha = new Date();
                  fecha.setDate(fecha.getDate() + parseInt(validezDias));
                  return fecha.toLocaleDateString('es-CL');
                })()}
              </div>
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={imprimirCotizacion}
              disabled={!clienteSeleccionado || listaCotizacion.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{fontFamily: 'system-ui'}}
            >
              <FaPrint /> Imprimir / PDF
            </button>
            <button
              onClick={guardarCotizacion}
              disabled={guardando ||!clienteSeleccionado || listaCotizacion.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{fontFamily: 'system-ui'}}
            >
              <FaSave /> {guardando? '⏳ Guardando...' : cotizacionEditando? '💾 Actualizar Cotización' : '💾 Guardar Cotización'}
            </button>
          </div>

          {/* FOOTER */}
          <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400 text-center">
            <p>{CONFIG.NOMBRE_EMPRESA} - {CONFIG.RUT_EMPRESA}</p>
          </div>

        </div>
      </div>
    </div>
  );
}

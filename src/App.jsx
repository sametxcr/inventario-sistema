import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';import { useState, useEffect } from "react";
import { RefreshProvider, useRefresh } from "./components/RefreshContext";
import { api } from "./api";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import CotizacionTab from "./components/CotizacionTab";
import Dashboard from "./components/Dashboard";
import ClientesTab from "./components/ClientesTab";
import HistorialCotizaciones from "./components/HistorialCotizaciones";
import OrdenTrabajoForm from './components/OrdenTrabajoForm';
import RetirosTab from "./components/RetiroProductos";
import ProyectCar from "./components/ProyectCar";
import RelojSistema from "./components/RelojSistema";
import { importarDesdeExcel } from "./utils/importarExcel";
import * as XLSX from 'xlsx';

// VERSIÓN ESTABLE DE VISTA COTIZACIÓN (sin CSS roto)
export const abrirVistaCotizacion = (cot, setMensaje) => {
  try {
    const ventana = window.open('', '_blank', 'height=900,width=1000,scrollbars=yes');

 if (!ventana) {
      setMensaje('Pop-up bloqueado. Permite ventanas emergentes', 'error');
      return;
    }

    const formatearRut = (rut) => {
      if (!rut) return '-';
      return rut.replace(/^(\d{1,2})(\d{3})(\d{3})([\dkK])$/, '$1.$2.$3-$4');
    };
    const formatearPrecio = (n) => '$' + Number(n || 0).toLocaleString('es-CL');



    // Adaptamos los datos que vienen de la BD
    const repuestos = (cot.items || []).filter(i => i.tipo === 'repuesto' ||!i.tipo);
    const manoObra = (cot.items || []).filter(i => i.tipo === 'mano_obra');

    const totalRepuestos = repuestos.reduce((sum, p) => sum + (p.total || p.precio_venta * p.cantidad * (1 - (p.descuento||0)/100)), 0);
    const totalManoObra = manoObra.reduce((sum, p) => sum + (p.total || p.precio_venta * p.cantidad * (1 - (p.descuento||0)/100)), 0);
    const total = cot.total || totalRepuestos + totalManoObra;
    const neto = cot.subtotal_neto || Math.round(total / 1.19);
    const iva = cot.iva || total - neto;

    const fechaHoy = cot.creado_at? new Date(cot.creado_at) : new Date();
    const fechaValidez = cot.validez_hasta? new Date(cot.validez_hasta) : new Date(Date.now() + 15*24*60*1000);
    const numCotiz = cot.id? `COT-${String(cot.id).padStart(4, '0')}` : 'BORRADOR';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cotización - ${cot.patente || 'BORRADOR'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 850px; margin: 0 auto; font-size: 11px; color: #1f2937; background: white; }
     .header { display: grid; grid-template-columns: auto 1fr; align-items: end; gap: 20px; border-bottom: 3px solid #dc2626; padding-bottom: 8px; margin-bottom: 15px; }
     .logo-img { height: 50px; width: 400px; object-fit: fill; }
     .cotizacion-box { text-align: right; }
     .cotizacion-titulo { font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
     .cotizacion-num { font-size: 16px; font-weight: 800; color: #dc2626; margin-bottom: 4px; }
     .cotizacion-num.borrador { color: #f59e0b; }
     .fecha-info { font-size: 9px; color: #6b7280; line-height: 1.4; }
     .info-cliente { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 12px; border-radius: 6px; margin: 12px 0; font-size: 12px; border-left: 4px solid #06b6d4; }
     .info-grid { display: grid; grid-template-columns: 80px 1fr 80px 1fr; gap: 4px 8px; }
     .info-label { font-weight: 600; color: #374151; }
     .info-value { color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background: linear-gradient(180deg, #1f2937 0%, #111827 100%); color: white; padding: 7px 8px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; }
          td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
     .total-box { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 14px; border-radius: 6px; margin-top: 15px; font-size: 11px; }
     .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
     .total-final { font-size: 17px; font-weight: 800; color: #10b981; border-top: 2px solid #10b981; padding-top: 8px; margin-top: 8px; }
     .section-title { background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 7px 10px; margin: 14px 0 6px 0; font-weight: 700; font-size: 10px; border-radius: 3px; }
     .condiciones { margin-top: 18px; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 9px; line-height: 1.6; }
     .badge-ext { display: inline-block; background: #f59e0b; color: white; font-size: 7px; padding: 1px 4px; border-radius: 2px; margin-left: 4px; font-weight: 600; }
          @media print { button { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          @page { margin: 1.5cm; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/BN.png" alt="Balladares Motors" class="logo-img" onerror="this.style.display='none'" />
          <div class="cotizacion-box">
            <div class="cotizacion-titulo">COTIZACIÓN</div>
            <div class="cotizacion-num ${!cot.id? 'borrador' : ''}">${numCotiz}</div>
            <div class="fecha-info">
              Fecha: ${fechaHoy.toLocaleDateString('es-CL')}<br>
              Válida hasta: ${fechaValidez.toLocaleDateString('es-CL')}
            </div>
          </div>
        </div>

        <div class="info-cliente">
          <div class="info-grid">
            <span class="info-label">Nombre:</span>
            <span class="info-value">${cot.nombre_cliente || 'Cliente General'}</span>
            <span class="info-label">RUT:</span>
            <span class="info-value">${formatearRut(cot.rut_cliente)}</span>
            <span class="info-label">Celular:</span>
            <span class="info-value">${cot.celular || 'N/A'}</span>
            <span class="info-label">Patente:</span>
            <span class="info-value"><strong>${cot.patente || '-'}</strong></span>
            <span class="info-label">Vehículo:</span>
            <span class="info-value">${cot.marca || ''} ${cot.modelo || ''}</span>
            <span class="info-label">Año:</span>
            <span class="info-value">${cot.anio || 'N/A'}</span>
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
                const precio = p.precio_venta || p.precio_unitario || 0;
                const cant = p.cantidad || 1;
                const desc = p.descuento || 0;
                const subtotal = p.total || Math.round(precio * cant * (1 - desc / 100));
                return `
                  <tr>
                    <td><strong style="color: #06b6d4;">${p.sku || p.codigo || 'MANUAL'}</strong></td>
                    <td>${p.nombre || p.descripcion || ''} ${!p.desde_inventario? '<span class="badge-ext">EXT</span>' : ''}</td>
                    <td style="text-align: center;">${cant}</td>
                    <td style="text-align: right;">${formatearPrecio(precio)}</td>
                    <td style="text-align: center;">${desc}%</td>
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
                const precio = p.precio_venta || p.precio_unitario || p.valor || 0;
                const cant = p.cantidad || 1;
                const desc = p.descuento || 0;
                const subtotal = p.total || Math.round(precio * cant * (1 - desc / 100));
                return `
                  <tr>
                    <td><strong style="color: #8b5cf6;">${p.sku || p.codigo || 'MDO'}</strong></td>
                    <td>${p.nombre || p.descripcion || ''}</td>
                    <td style="text-align: center;">${cant}</td>
                    <td style="text-align: right;">${formatearPrecio(precio)}</td>
                    <td style="text-align: center;">${desc}%</td>
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

        ${cot.observaciones? `
          <div class="info-cliente" style="margin-top: 12px; border-left-color: #8b5cf6;">
            <strong style="color: #374151;">Observaciones:</strong><br>
            <span style="color: #4b5563;">${cot.observaciones}</span>
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

        <button onclick="window.print()" style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0.2);">
          🖨 Imprimir Cotización
        </button>
      </body>
      </html>
    `;

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
  } catch (err) {
    console.error('ERROR:', err);
    setMensaje('Error: ' + err.message, 'error');
  }
};

function App() {
  const { triggerRefresh } = useRefresh();
  const [tab, setTab] = useState('dashboard');
  const [tabActivo, setTabActivo] = useState('dashboard');
  const [otEnEdicion, setOtEnEdicion] = useState(null);
  const [mostrarModalOT, setMostrarModalOT] = useState(false);
  const [productos, setProductos] = useState([]);
  const [productoEditando, setProductoEditando] = useState(null);
  const [modoForm, setModoForm] = useState('crear');
  const [listaCotizacion, setListaCotizacion] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [filtroFamilia, setFiltroFamilia] = useState('Todas');
  const [familiasDB, setFamiliasDB] = useState(['Todas']);
  const [historialSKU, setHistorialSKU] = useState(null);
  const [historialData, setHistorialData] = useState([]);
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState(null);
  const [modalCotizacion, setModalCotizacion] = useState(null);
  const [validezDias, setValidezDias] = useState(15);
  
  

  
  const mostrarMensaje = (texto, tipo = 'success') => {
  if (tipo === 'success') toast.success(texto);
  if (tipo === 'error') toast.error(texto);
  if (tipo === 'warning') toast.warning(texto);
  if (tipo === 'info') toast.info(texto);
};


  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busqueda);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    if (historialSKU) {
      api.get(`historial/${historialSKU}`)
   .then(data => {
          setHistorialData(data);
        })
   .catch(err => {
          console.error('Error cargando historial:', err);
          setHistorialData([]);
        });
    }
  }, [historialSKU]);

  useEffect(() => {
    if (tab!== 'cotizacion') {
      setListaCotizacion([]);
      setCotizacionEditando(null);
      setModalCotizacion(null);
      setValidezDias(15);
    }
  }, [tab]);

  const cargarFamilias = async () => {
    const productos = await api.get('productos');
    const familiasUnicas = [...new Set(productos.map(p => p.familia))].filter(Boolean).sort();
    setFamiliasDB(['Todas',...familiasUnicas]);
  };

 const cargarProductos = async () => {
  setCargando(true);
  try {
    let productos = await api.get('productos');
    if (filtroFamilia!== 'Todas') {
      productos = productos.filter(p => p.familia === filtroFamilia);
    }
    if (busquedaDebounced.trim()) {
      const b = busquedaDebounced.toLowerCase();
      productos = productos.filter(p =>
        p.sku?.toLowerCase().includes(b) ||
        p.nombre?.toLowerCase().includes(b)
      );
    }
    setProductos([...productos]); // ← CAMBIA ESTA LÍNEA: agrega el spread ...
  } catch (error) {
    console.error('Error cargando productos:', error);
    mostrarMensaje('Error al cargar productos', 'error');
  }
  setCargando(false);
};

useEffect(() => {
  if (otEnEdicion && otEnEdicion.id === null) {
    setTab('cotizacion');
    setListaCotizacion([
     ...otEnEdicion.repuestos_usados.map(r => ({
        id: `REP_${Date.now()}_${r.sku}`,
        tipo: 'repuesto',
        nombre: r.nombre,
        sku: r.sku,
        cantidad: r.cantidad,
        precio_venta: r.precio_venta,
        descuento: 0,
        desde_inventario: r.desde_inventario
      })),
     ...otEnEdicion.mano_obra.map(m => ({
        id: `MDO_${Date.now()}_${m.descripcion}`,
        tipo: 'mano_obra',
        nombre: m.descripcion,
        sku: 'MDO',
        cantidad: m.cantidad,
        precio_venta: m.valor_unit,
        descuento: 0,
        desde_inventario: false
      }))
    ]);
  }
}, [otEnEdicion]);

  useEffect(() => {
    cargarFamilias();
  }, []);

// BIEN - Carga siempre al abrir la app
useEffect(() => {
  cargarProductos(); // ← Se ejecuta 1 vez al montar
  cargarFamilias();
}, []);

// Y deja este otro para los filtros de Inventario
useEffect(() => {
  if (tab === 'inventario') cargarProductos();
}, [tab, busquedaDebounced, filtroFamilia]);

  const limpiarEdicion = () => {
    setProductoEditando(null);
	setModoForm('crear');
  };
  
  const handleVerProducto = (producto) => {
    setProductoEditando(producto);
    setModoForm('ver'); // ← MODO SOLO LECTURA
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportarExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    try {
      const { importados, errores } = await importarDesdeExcel(file);
      mostrarMensaje(`Importados: ${importados}. Errores: ${errores.length}`, 'success');
      if (errores.length > 0) console.log('Errores al importar:', errores);
      await cargarFamilias();
      await cargarProductos();
    } catch (err) {
      mostrarMensaje('Error al leer el Excel: ' + err.message, 'error');
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const handleExportarExcel = async () => {
    setExportando(true);
    try {
      const todosLosProductos = await api.get('productos');
      if (todosLosProductos.length === 0) {
        mostrarMensaje('Operación cancelada', 'info');
        setExportando(false);
        return;
      }
      const datosParaExcel = todosLosProductos.map(p => ({
        SKU: p.sku || '',
        Nombre: p.nombre || '',
        Familia: p.familia || '',
        'Stock Local': p.stock_local || 0,
        'Stock Bodega': p.stock_bodega || 0,
        'Precio Costo': p.precio_costo || 0,
        'Precio Venta': p.precio_venta || 0,
        'Stock Minimo': p.stock_minimo || 0,
        Proveedor: p.proveedor || '',
        Ubicacion: p.ubicacion || ''
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datosParaExcel);
      ws['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `inventario_balladares_${fecha}.xlsx`);
      mostrarMensaje(`Exportados ${todosLosProductos.length} productos a Excel`, 'success');
    } catch (err) {
      mostrarMensaje('Error al exportar: ' + err.message, 'error');
      console.error(err);
    } finally {
      setExportando(false);
    }
  };

  const handleBorrarBD = async () => {
    const confirm1 = window.confirm('⚠ ¿Borrar TODO el inventario?\n\nSe eliminarán todos los productos.\n\nLos clientes y las OT se mantendrán intactos.');
    if (!confirm1) return;
    const confirm2 = window.prompt('Para confirmar, escribe: BORRAR INVENTARIO\n\nEsta acción NO se puede deshacer.');
    if (confirm2!== 'BORRAR INVENTARIO') {
      mostrarMensaje('Operación cancelada', 'info');
      return;
    }
    setBorrando(true);
    try {
      setListaCotizacion([]);
      setProductoEditando(null);
      await cargarFamilias();
      await cargarProductos();
      mostrarMensaje('Función deshabilitada temporalmente', 'warning');
    } catch (err) {
      mostrarMensaje('Error al borrar: ' + err.message, 'error');
    } finally {
      setBorrando(false);
    }
  };

// ← MODIFICADA: AHORA ES SOLO PARA EDITAR
  const handleEditarProducto = (producto) => {
    setProductoEditando(producto);
    setModoForm('editar'); // ← MODO EDICIÓN
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
	{/* TOAST DE MENSAJES - PEGA ESTO JUSTO AQUÍ */}

      <header className="relative border-b border-gray-800">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/skyline-bg.png')", opacity: 0.9, filter: "brightness(1.2) saturate(1.5) contrast(1.8)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/85 via-gray-900/70 to-gray-900/90" />
        <div className="relative z-10 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-3 items-center gap-6">
              <div className="w-full"><img src="/logo.png" alt="Logo Balladares" className="w-full h-20 md:h-24 object-fill drop-shadow-2xl" onError={(e) => e.target.style.display = 'none'} /></div>
              <div className="text-center px-2"><h1 className="text-1xl md:text-1xl" style={{ fontFamily: "'Hirace', sans-serif", letterSpacing: '0.15em', color: "#ffffff" }}>SISTEMA CONTROL TALLER</h1></div>
              <div className="w-full"><img src="/LB.png" alt="Logo LB" className="w-full h-20 md:h-24 object-fill drop-shadow-2xl" onError={(e) => e.target.style.display = 'none'} /></div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-center px-4">
          <button onClick={() => setTab('dashboard')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'dashboard'? 'bg-gray-700 border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-white'}`}>📊 Dashboard</button>
          <button onClick={() => setTab('inventario')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'inventario'? 'bg-gray-700 border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-white'}`}>📦 Inventario</button>
          <button onClick={() => setTab('clientes')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'clientes'? 'bg-gray-700 border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-white'}`}>🚗 Clientes</button>
          <button onClick={() => setTab('cotizacion')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'cotizacion'? 'bg-gray-700 border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-white'}`}>📄 Cotización</button>
          <button onClick={() => setTab('historial-cotizaciones')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'historial-cotizaciones'? 'bg-gray-700 border-b-2 border-cyan-500 text-cyan-400' : 'text-gray-400 hover:text-white'}`}>📋 Historial COT</button>
          <button onClick={() => setTab('retiros')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'retiros'? 'bg-gray-700 border-b-2 border-orange-500 text-orange-400' : 'text-gray-400 hover:text-white'}`}>📦 Retiros</button>          <button onClick={() => setTab('proyect-car')} className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${tab === 'proyect-car'? 'bg-gray-700 border-b-2 border-purple-500 text-purple-400' : 'text-gray-400 hover:text-white'}`}>🏎 Proyect Car</button>
          <RelojSistema />
        </div>
      </div>

    
      {tab === 'inventario' && (
        <>
          <div className="p-4 bg-gray-800 flex gap-2 mx-4 mt-4 rounded border-gray-700 flex-wrap items-center">
  <div className="relative flex-1 min-w-"><input placeholder="Buscar SKU o nombre..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none pr-8" value={busqueda} onChange={e => setBusqueda(e.target.value)} />{busqueda!== busquedaDebounced && (<span className="absolute right-2 top-2 text-gray-400 text-xs animate-pulse">⏳</span>)}</div>
  <select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none min-w-" value={filtroFamilia} onChange={e => setFiltroFamilia(e.target.value)}>{familiasDB.map(f => <option key={f} value={f}>{f}</option>)}</select>
  <button onClick={handleExportarExcel} disabled={exportando} className={`px-4 py-2 bg-green-600 rounded cursor-pointer font-bold hover:bg-green-700 text-sm ${exportando? 'opacity-50 cursor-not-allowed' : ''}`}>{exportando? '⏳ Exportando...' : '📥 Exportar Excel'}</button>
            <label className={`px-4 py-2 bg-purple-600 rounded cursor-pointer font-bold hover:bg-purple-700 text-sm ${importando? 'opacity-50 cursor-not-allowed' : ''}`}>{importando? '⏳ Importando...' : '📊 Importar Excel'}<input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImportarExcel} disabled={importando} /></label>
            <button onClick={handleBorrarBD} disabled={borrando} className={`px-4 py-2 bg-red-600 rounded font-bold hover:bg-red-700 text-sm ${borrando? 'opacity-50 cursor-not-allowed' : ''}`} title="Solo borra productos, NO toca clientes ni OT">{borrando? '⏳ Borrando...' : '🗑 Borrar Inventario'}</button>
          </div>
          <ProductForm
  productoEditando={productoEditando}
  modo={modoForm}
  onGuardar={async (esActualizacion) => { // ← AGREGA async
    setProductoEditando(null);
	setModoForm('crear');
    await cargarProductos(); // ← AGREGA await
    await cargarFamilias(); // ← AGREGA await
    mostrarMensaje(
      esActualizacion ? 'Producto actualizado correctamente' : 'Producto guardado correctamente', 
      'success'
    );
  }}
  onLimpiar={limpiarEdicion}
  onFamiliasChange={cargarFamilias}
  onEditarProducto={handleEditarProducto}
  setMensaje={mostrarMensaje}
/>
          {cargando && (<div className="text-center py-4 text-gray-400">⏳ Cargando productos...</div>)}
          <ProductTable 
  productos={productos} 
  onVerProducto={handleVerProducto}
  onEditarProducto={handleEditarProducto}
  listaCotizacion={listaCotizacion} 
  setListaCotizacion={setListaCotizacion} 
  onRecargar={() => { cargarProductos(); cargarFamilias(); }} 
  onVerHistorial={setHistorialSKU}
  setMensaje={mostrarMensaje} // ← AGREGA ESTA LÍNEA
/>
        </>
      )}
      {/* DESPUÉS - AGREGA setMensaje={mostrarMensaje} */}
{tab === 'clientes' && <ClientesTab setMensaje={mostrarMensaje} />}

{tab === 'cotizacion' && (
  <CotizacionTab
    listaCotizacion={listaCotizacion}
    setListaCotizacion={setListaCotizacion}
    cotizacionEditando={cotizacionEditando}
    setCotizacionEditando={setCotizacionEditando}
    modalCotizacion={modalCotizacion}
    setModalCotizacion={setModalCotizacion}
    validezDias={validezDias}
    setValidezDias={setValidezDias}
    setMensaje={mostrarMensaje} // ← AGREGA ESTA LÍNEA
  />
)}

{tab === 'dashboard' && <Dashboard setMensaje={mostrarMensaje} />}

{tab === 'historial-cotizaciones' && (
  <HistorialCotizaciones 
    setTabActivo={setTab}
    setListaCotizacion={setListaCotizacion}
    setCotizacionEditando={setCotizacionEditando}
    setModalCotizacion={setModalCotizacion}
    setValidezDias={setValidezDias}
    setOtEnEdicion={setOtEnEdicion}
    setMostrarModalOT={setMostrarModalOT}
    setMensaje={mostrarMensaje} // ← AGREGA ESTA LÍNEA
  />
)}
      
      {tab === 'proyect-car' && <ProyectCar />}

{tab === 'retiros' && (
  <RetirosTab 
    setMensaje={mostrarMensaje}
    productos={productos}
    onRetiroGuardado={(otActualizada) => {
    
      console.log('OT actualizada desde RetirosTab:', otActualizada);
      cargarProductos();
      triggerRefresh();
    }}
  />
)}

{historialSKU && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" onClick={() => setHistorialSKU(null)}>
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-cyan-500/20" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
              <div className="relative flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">📊</div>
                    Historial de Precios
                  </h2>
                  <div className="flex items-baseline gap-3 mt-1">
                    <p className="text-cyan-100 font-mono text-base font-bold">{historialSKU}</p>
                    <span className="text-cyan-200/70 text-sm truncate">
                      {productos.find(p => p.sku === historialSKU)?.nombre || ''}
                    </span>
                  </div>
                </div>
                <button onClick={() => setHistorialSKU(null)} className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl flex items-center justify-center text-white transition-all hover:rotate-90">✕</button>
              </div>
            </div>

            <div className="p-5 overflow-auto max-h-[calc(90vh-110px)]">
              {historialData.length === 0? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-2xl flex items-center justify-center text-4xl">📈</div>
                  <p className="text-gray-400 text-lg">Sin historial aún</p>
                  <p className="text-gray-600 text-sm mt-1">Los cambios aparecerán aquí automáticamente</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-950/50 rounded-2xl p-4 mb-4 border border-gray-800">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evolución Precio Venta</h3>
                      <div className="flex gap-4 text-[10px]">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full"></span><span className="text-gray-500">Anterior</span></span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span><span className="text-gray-500">Nuevo</span></span>
                      </div>
                    </div>

                    {(() => {
                      const data = [...historialData].filter(h => h.venta_nuevo > 0) .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
                      const valores = data.flatMap(d => [d.venta_anterior, d.venta_nuevo]);
                      const max = Math.max(...valores);
                      const min = Math.min(...valores);
                      const range = max - min || 1;
                      const paddingLeft = 70;
                      const chartWidth = 760;
                      const chartHeight = 150;
                      const getY = (valor) => 180 - ((valor - min) / range) * chartHeight;
                      const getX = (i) => (i / (data.length - 1 || 1)) * chartWidth + paddingLeft;
                      const points = data.map((d, i) => `${getX(i)},${getY(d.venta_nuevo)}`).join(' ');
                      const areaPoints = `${paddingLeft},180 ${points} ${getX(data.length-1)},180`;
                      const yTicks = 4;
                      const yValues = Array.from({length: yTicks + 1}, (_, i) => min + (range * i / yTicks));

                      const mesesUnicos = [];
                      const labels = [];
                      data.forEach((h) => {
                        const fecha = new Date(h.fecha);
                        const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`;
                        if (!mesesUnicos.includes(mesKey)) {
                          mesesUnicos.push(mesKey);
                          labels.push(fecha.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }));
                        } else {
                          labels.push('');
                        }
                      });

                      return (
                        <div className="relative h-64">
                          <svg className="w-full h-full" viewBox="0 0 850 220">
                            <defs>
                              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#06b6d4" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            <g>
                              {yValues.map((val, i) => {
                                const y = getY(val);
                                return (
                                  <g key={i}>
                                    <line x1={paddingLeft-5} y1={y} x2={830} y2={y} stroke="#1f2937" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                                    <text x="60" y={y+4} fill="#9ca3af" fontSize="13" textAnchor="end" fontFamily="monospace" fontWeight="600">
                                      ${Math.round(val).toLocaleString('es-CL')}
                                    </text>
                                  </g>
                                );
                              })}

                              <polygon points={areaPoints} fill="url(#areaGrad)" className="animate-in fade-in duration-1000" />

                              <polyline points={points} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1000" strokeDashoffset="1000" className="animate-[dash_2s_ease-out_forwards]" />

                              {data.map((d, i) => {
                                const x = getX(i);
                                const y = getY(d.venta_nuevo);
                                return (
                                  <g key={i} className="animate-in zoom-in duration-500" style={{animationDelay: `${i*100}ms`}}>
                                    <circle cx={x} cy={y} r="14" fill="#06b6d4" fillOpacity="0" className="cursor-pointer" />
                                    <circle cx={x} cy={y} r="5" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
                                    <circle cx={x} cy={y} r="9" fill="#06b6d4" fillOpacity="0.2" className="animate-ping" />
                                    <title>${d.venta_nuevo.toLocaleString('es-CL')} - {new Date(d.fecha).toLocaleDateString('es-CL')}</title>
                                  </g>
                                );
                              })}

                              <text x="18" y="35" fill="#9ca3af" fontSize="12" fontWeight="bold" transform="rotate(-90 18 35)" textAnchor="middle" letterSpacing="2">VALOR</text>
                            </g>
                          </svg>

                          <div className="absolute bottom-0 left-[70px] right-[20px] flex justify-between text-[12px] text-gray-400 font-medium">
                            {data.map((h, i) => (
                              <span key={i} className="text-center min-w-[40px]">
                                {labels[i]}
                              </span>
                            ))}
                          </div>
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-gray-500 font-bold tracking-widest">TIEMPO →</div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    {historialData.map((h, i) => {
                      const cambio = ((h.venta_nuevo - h.venta_anterior) / h.venta_anterior * 100);
                      const esAlza = cambio > 0;
                      const esBaja = cambio < 0;
                      return (
                        <div key={i} className="group relative bg-gray-800/50 backdrop-blur border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/10 animate-in slide-in-from-bottom-2" style={{animationDelay: `${i*50}ms`}}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${esAlza? 'bg-emerald-500' : esBaja? 'bg-red-500' : 'bg-gray-600'}`}></div>
                          <div className="flex items-start justify-between gap-3 pl-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-mono text-gray-500">{new Date(h.fecha).toLocaleDateString('es-CL')} • {new Date(h.fecha).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${esAlza? 'bg-emerald-500/20 text-emerald-400' : esBaja? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                                  {esAlza? '↗' : esBaja? '↘' : '→'} {Math.abs(cambio).toFixed(1)}%
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Precio Neto</div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-gray-500 line-through text-xs">${Number(h.neto_anterior).toLocaleString('es-CL')}</span>
                                    <span className="text-white font-bold text-xs">→</span>
                                    <span className="text-emerald-400 font-bold text-base">${Number(h.neto_nuevo).toLocaleString('es-CL')}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Precio Venta</div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-gray-500 line-through text-xs">${Number(h.venta_anterior).toLocaleString('es-CL')}</span>
                                    <span className="text-white font-bold text-xs">→</span>
                                    <span className="text-cyan-400 font-bold text-base">${Number(h.venta_nuevo).toLocaleString('es-CL')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium ${h.motivo === 'Actualización sin motivo'? 'bg-gray-700/50 text-gray-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                {h.motivo || 'Sin motivo'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`
            @keyframes dash {
              to { stroke-dashoffset: 0; }
            }
          `}</style>
        </div>
      )}

      {mostrarModalOT && (
        <OrdenTrabajoForm 
          cliente={{ 
            patente: otEnEdicion?.patente,
            rut: otEnEdicion?.rut_cliente,
            nombre: otEnEdicion?.nombre_cliente,
            marca: otEnEdicion?.marca,
            modelo: otEnEdicion?.modelo,
            anio: otEnEdicion?.anio
          }}
          otExistente={otEnEdicion}
          onGuardar={() => {
            setMostrarModalOT(false);
            setOtEnEdicion(null);
            cargarProductos();
			mostrarMensaje('OT creada correctamente', 'success');
          }}
          onCerrar={() => {
            setMostrarModalOT(false);
            setOtEnEdicion(null);
          }}
		  onIrAClientes={() => setTab('clientes')}
		  setMensaje={mostrarMensaje}
        />
      )}

      <footer className="bg-gray-900 border-t border-gray-800 mt-12 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          <p>© 2026 Balladares Motors · Sistema de Gestión Taller Mecánico</p>
          <p className="mt-1">powered by <span className="text-cyan-400 font-bold">SameT</span></p>
        </div>
      </footer>
	  {/* TOAST CONTAINER - PÉGALO AQUÍ */}
      <ToastContainer 
        position="bottom-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        theme="dark"
        toastStyle={{ backgroundColor: '#1f2937', color: '#fff' }}
		/>
    </div>
  );
}

export default function WrappedApp() {
  return (
    <RefreshProvider>
      <App />
    </RefreshProvider>
  );
}


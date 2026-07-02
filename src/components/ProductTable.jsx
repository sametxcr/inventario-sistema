import { formatearPrecio } from '../utils/calculations';
import { FAMILY_COLORS } from '../config/app';
import { api } from '../api';

export default function ProductTable({ 
  productos, 
  onVerProducto,
  onEditarProducto,
  listaCotizacion, 
  setListaCotizacion, 
  onRecargar,
  onVerHistorial,
  setMensaje // ← AGREGA ESTA LÍNEA
}) {
  
const eliminarProducto = async (id, sku) => {
  if (!window.confirm(`¿Eliminar ${sku}?\n\nSe borrará también su historial de movimientos.`)) return;
  
  try {
    await api.delete(`productos/${id}`);
    setListaCotizacion(listaCotizacion.filter(item => item.sku !== sku));
    onRecargar();
    setMensaje(`Producto ${sku} eliminado`, 'success');
  } catch (err) {
    setMensaje('Error al eliminar producto', 'error');
  }
};

  return (
    <div className="mx-4 mb-4 bg-gray-800 rounded border border-gray-700">
      <div className="">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="p-2 w-12"></th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-center">FOTO</th>
              <th className="p-2 text-left">NOMBRE</th>
              <th className="p-2 text-left">FAMILIA</th>
              <th className="p-2 text-center">STOCK L</th>
              <th className="p-2 text-center">STOCK B</th>
              <th className="p-2 text-center">TOTAL</th>
              <th className="p-2 text-right">NETO COMPRA</th>
              <th className="p-2 text-right">NETO FINAL</th>
              <th className="p-2 text-right">PRECIO VENTA</th>
              <th className="p-2 text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="12" className="text-center p-8 text-gray-500">
                  No hay productos. Agrega uno arriba o importa un Excel.
                </td>
              </tr>
            ) : (
              productos.map(p => {
                const stockTotal = p.stock_local + p.stock_bodega;
                const stockBajo = stockTotal < p.stock_minimo;
                const colorFamilia = FAMILY_COLORS[p.familia] || '#ffffff';
                
                return (
                  <tr 
                    key={p.id} 
                    className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors"
                   
                    onClick={() => onVerProducto(p)} // ← CLICK EN FILA = SOLO VER
                  >
                    <td className="p-2 text-center w-12">
                      {stockBajo && (
                        <span 
                          className="text-red-500 text-xl animate-pulse inline-block" 
                          title={`⚠ Stock bajo! Mínimo: ${p.stock_minimo} | Actual: ${stockTotal}`}
                        >
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-bold">{p.sku}</td>
                    
                    <td className="p-2 text-center">
                      {p.imagen_url ? (
                        <img 
                          src={`${API_URL}${p.imagen_url}`}
                          alt={p.nombre}
                          className="w-12 h-12 object-cover rounded mx-auto hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation(); // ← No abre el form
                            window.open(`${API_URL}${p.imagen_url}`, '_blank');
                          }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/48?text=📷';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xs mx-auto">
                          📷
                        </div>
                      )}
                    </td>
                    
                    <td className="p-2">{p.nombre}</td>
                    <td className="p-2">
                      <span style={{ color: colorFamilia }} className="font-bold">
                        {p.familia}
                      </span>
                    </td>
                    <td className={`p-2 text-center ${p.stock_local === 0 ? 'text-red-500 font-bold' : ''}`}>
                      {p.stock_local}
                    </td>
                    <td className={`p-2 text-center ${p.stock_bodega === 0 ? 'text-red-500 font-bold' : ''}`}>
                      {p.stock_bodega}
                    </td>
                    <td className={`p-2 text-center font-bold ${stockBajo ? 'text-red-500' : ''}`}>
                      {stockTotal}
                    </td>
                    <td className="p-2 text-right">{formatearPrecio(p.neto_compra)}</td>
                    <td className="p-2 text-right text-cyan-400">{formatearPrecio(p.neto_final)}</td>
                    <td className="p-2 text-right text-yellow-400 font-bold">
                      {formatearPrecio(p.precio_venta)}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // ← CLAVE: evita el click de la fila
                            onEditarProducto(p); // ← CLICK EN LÁPIZ = EDITAR
                          }}
                          className="text-cyan-400 hover:text-cyan-300 hover:scale-125 transition-all"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onVerHistorial(p.sku);
                          }}
                          className="text-green-400 hover:text-green-300 hover:scale-125 transition-all"
                          title="Ver historial"
                        >
                          📊
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarProducto(p.id, p.sku);
                          }}
                          className="text-red-400 hover:text-red-300 hover:scale-125 transition-all"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


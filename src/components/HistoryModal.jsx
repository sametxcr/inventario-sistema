import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../api';
import { formatearPrecio } from '../utils/calculations';

export default function HistoryModal({ sku, onCerrar }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sku) return;
    cargarHistorial();
  }, [sku]);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const data = await api.get(`historial/${sku}`);

      // Formatear pa Recharts
      const dataGrafico = data.map(h => ({
        fecha: new Date(h.fecha).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        'Neto': Number(h.neto_nuevo),
        'Venta': Number(h.venta_nuevo),
        // Pa la tabla
        fechaCompleta: new Date(h.fecha).toLocaleString('es-CL'),
        neto_anterior: h.neto_anterior,
        neto_nuevo: h.neto_nuevo,
        venta_anterior: h.venta_anterior,
        venta_nuevo: h.venta_nuevo,
        motivo: h.motivo,
        id: h.id
      }));

      setHistorial(dataGrafico);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setHistorial([]);
    }
    setLoading(false);
  };

  if (!sku) return null;

  const tooltipStyle = {
    backgroundColor: '#111827',
    border: '2px solid #374151',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#FFFFFF'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[300] p-4" onClick={onCerrar}>
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h- overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-cyan-400">Historial de {sku}</h2>
          <button onClick={onCerrar} className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700">✕</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {loading? (
            <div className="h-64 flex items-center justify-center text-gray-500">Cargando historial...</div>
          ) : historial.length === 0? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Sin historial de cambios todavía
            </div>
          ) : (
            <>
              {/* GRÁFICO */}
              <div className="mb-4 bg-gray-900 p-3 rounded">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historial}>
                    <XAxis
                      dataKey="fecha"
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12, fill: '#E5E7EB' }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12, fill: '#E5E7EB' }}
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                      formatter={(value) => formatearPrecio(value)}
                    />
                    <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                    <Line
                      type="monotone"
                      dataKey="Neto"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: '#06b6d4', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Venta"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* TABLA */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-gray-100">Fecha</th>
                      <th className="text-right p-2 text-gray-100">Neto Ant.</th>
                      <th className="text-right p-2 text-gray-100">Neto Nuevo</th>
                      <th className="text-right p-2 text-gray-100">Venta Ant.</th>
                      <th className="text-right p-2 text-gray-100">Venta Nuevo</th>
                      <th className="text-left p-2 text-gray-100">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-2 text-gray-300">{h.fechaCompleta}</td>
                        <td className="p-2 text-right text-red-400">{formatearPrecio(h.neto_anterior)}</td>
                        <td className="p-2 text-right text-cyan-400 font-bold">{formatearPrecio(h.neto_nuevo)}</td>
                        <td className="p-2 text-right text-red-400">{formatearPrecio(h.venta_anterior)}</td>
                        <td className="p-2 text-right text-green-400 font-bold">{formatearPrecio(h.venta_nuevo)}</td>
                        <td className="p-2 text-gray-400 text-xs">{h.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onCerrar}
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
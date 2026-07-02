import { useEffect, useState } from 'react';
import { getFechaChile, parsearFechaChile } from '../utils/fechaChile';
import { useRefresh } from '../components/RefreshContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReactECharts from 'echarts-for-react';
import { api } from '../api';
import { abrirOTEnNuevaVentana } from '../utils/imprimirOT';
import { getFamilyColor } from '../config/app';
import { formatearPrecio } from '../utils/calculations';
import OrdenTrabajoForm from './OrdenTrabajoForm';

export default function Dashboard() {
  const { refreshKey } = useRefresh();
  const [stats, setStats] = useState({
    total: 0,
    valorTotal: 0,
    stockBajo: 0,
    familiasCriticas: [],
    autosEnTaller: 0,
    otsAbiertas: 0
  });
  const [dataFamilias, setDataFamilias] = useState([]);
  const [valorPorFamilia, setValorPorFamilia] = useState([]);
  const [mostrarAutosEnTaller, setMostrarAutosEnTaller] = useState(false);
  const [autosEnTaller, setAutosEnTaller] = useState([]);
  const [otEditando, setOtEditando] = useState(null);
  const [ingresos, setIngresos] = useState({ hoy: 0, semana: 0, mes: 0 });
  const [ultimosFinalizados, setUltimosFinalizados] = useState([]);
  const [porDia, setPorDia] = useState({});
  const [ots, setOts] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mostrarDetalleIngresos, setMostrarDetalleIngresos] = useState(false);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [refreshKey]);



  const calcularDiasTaller = (ot) => {
    if (ot.estado_ot === 'Entregado' && ot.dias_taller) {
      return ot.dias_taller;
    }
    const inicio = parsearFechaChile(ot.fecha_creacion); // ← CAMBIO
    if (!inicio) return 1;
    let fechaFin;
    if (ot.estado_ot === 'Entregado' && ot.fecha_entrega) {
      fechaFin = parsearFechaChile(ot.fecha_entrega); // ← CAMBIO
    } else {
      fechaFin = new Date();
    }
    inicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(fechaFin - inicio);
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return dias < 1? 1 : dias;
  };

  const cargarDatos = async () => {
    const [data, otsData, clientesData] = await Promise.all([
      api.get('productos'),
      api.get('ordenes_trabajo'),
      api.get('clientes')
    ]);

    setOts(otsData);
    setClientes(clientesData);

    const total = data.length;
    const valorTotal = data.reduce((sum, p) => sum + (p.precio_venta * (p.stock_local + p.stock_bodega)), 0);
    const stockBajo = data.filter(p => (p.stock_local + p.stock_bodega) < p.stock_minimo).length;

    const familiasCriticasMap = data
.filter(p => (p.stock_local + p.stock_bodega) < p.stock_minimo)
.reduce((acc, p) => {
        const fam = p.familia || 'OTROS';
        acc[fam] = (acc[fam] || 0) + 1;
        return acc;
      }, {});

    const familiasCriticas = Object.entries(familiasCriticasMap)
.sort((a,b) => b[1]-a[1])
.slice(0,3)
.map(([name, cant]) => ({ name, cant }));

    const otsAbiertas = otsData.filter(ot => ot.estado_ot!== 'Entregado');
    const patentesUnicas = [...new Set(otsAbiertas.map(ot => ot.patente))];
    const autosEnTaller = patentesUnicas.length;
    const otsAbiertasTotal = otsAbiertas.length;

    setStats({ total, valorTotal, stockBajo, familiasCriticas, autosEnTaller, otsAbiertas: otsAbiertasTotal });

    const familiasMap = {};
    data.forEach(p => {
      const fam = p.familia || 'OTROS';
      if (!familiasMap[fam]) {
        familiasMap[fam] = {
          name: fam,
          cantidad: 0,
          valor: 0,
          color: getFamilyColor(fam)
        };
      }
      familiasMap[fam].cantidad += 1;
      familiasMap[fam].valor += p.precio_venta * (p.stock_local + p.stock_bodega);
    });

    const familiasArray = Object.values(familiasMap).sort((a, b) => b.cantidad - a.cantidad);
    setDataFamilias(familiasArray);
    setValorPorFamilia(familiasArray.sort((a, b) => b.valor - a.valor).slice(0, 8));

    const otsEntregadas = otsData
.filter(ot => ot.estado_ot === 'Entregado' && ot.fecha_entrega)
.map(ot => {
        const cliente = clientesData.find(c =>
          c.patente?.trim().toUpperCase() === ot.patente?.trim().toUpperCase()
        );
        return {
   ...ot,
          cliente_nombre: cliente?.nombre || null,
          marca: cliente?.marca || null,
          modelo: cliente?.modelo || null
        };
      });

    const ultimos = [...otsEntregadas]
.sort((a,b)=> parsearFechaChile(b.fecha_entrega) - parsearFechaChile(a.fecha_entrega))
.slice(0,10);
    setUltimosFinalizados(ultimos);

    const porDiaTemp = {};
    otsEntregadas.forEach(ot=>{
      const f = parsearFechaChile(ot.fecha_entrega);
      if(!f) return;
      const key = f.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).split('/').join('-');
      porDiaTemp[key] = (porDiaTemp[key]||0) + (Number(ot.monto_final)||Number(ot.monto_estimado)||0);
    });
    setPorDia(porDiaTemp);

    const ahoraChile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const hoyInicio = new Date(ahoraChile);
hoyInicio.setHours(0, 0, 0, 0);
const hoyFin = new Date(ahoraChile);
hoyFin.setHours(23, 59, 59, 999);

const ingresosHoy = otsEntregadas
  .filter(ot => {
    const f = parsearFechaChile(ot.fecha_entrega);
    if (!f) return false;
    return f >= hoyInicio && f <= hoyFin;
  })
  .reduce((s, ot) => s + (Number(ot.monto_final) || Number(ot.monto_estimado) || 0), 0);

    const diaSemana = ahoraChile.getDay();
    const lunesOffset = diaSemana === 0? -6 : 1 - diaSemana;
    const lunesSemana = new Date(ahoraChile);
    lunesSemana.setDate(ahoraChile.getDate() + lunesOffset);
    lunesSemana.setHours(0, 0, 0, 0);

    const domingoSemana = new Date(lunesSemana);
    domingoSemana.setDate(lunesSemana.getDate() + 6);
    domingoSemana.setHours(23, 59, 59, 999);

// REEMPLAZA DESDE LÍNEA 137 HASTA 147
const ingresosSemana = otsEntregadas.filter(ot => {
  const f = parsearFechaChile(ot.fecha_entrega);
  if (!f) return false;
  f.setHours(0, 0, 0, 0);
  return f >= lunesSemana && f <= domingoSemana;
}).reduce((s, ot) => s + (Number(ot.monto_final) || 0), 0);

const mesActual = ahoraChile.getMonth();
const anioActual = ahoraChile.getFullYear();
const ingresosMes = otsEntregadas.filter(ot => {
  const f = parsearFechaChile(ot.fecha_entrega);
  if (!f) return false;
  return f.getMonth() === mesActual && f.getFullYear() === anioActual;
}).reduce((s, ot) => s + (Number(ot.monto_final) || 0), 0);

setIngresos({ hoy: ingresosHoy, semana: ingresosSemana, mes: ingresosMes });


  };

  const verAutosEnTaller = async () => {
    const otsTodas = await api.get('ordenes_trabajo');
    const otsAbiertas = otsTodas.filter(ot => ot.estado_ot!== 'Entregado');

    const agrupadas = {};
    otsAbiertas.forEach(ot => {
      if (!agrupadas[ot.patente]) {
        agrupadas[ot.patente] = {
          patente: ot.patente,
          vehiculo: '',
          cliente: '',
          ots: [],
          diasMaximo: 0,
          tecnicos: new Set()
        };
      }
      agrupadas[ot.patente].ots.push(ot);
      const dias = calcularDiasTaller(ot);
      if (dias > agrupadas[ot.patente].diasMaximo) {
        agrupadas[ot.patente].diasMaximo = dias;
      }
      if (ot.tecnico_asignado) {
        agrupadas[ot.patente].tecnicos.add(ot.tecnico_asignado);
      }
    });

    const clientes = await api.get('clientes');
    for (const patente in agrupadas) {
      const cliente = clientes.find(c => c.patente === patente);
      if (cliente) {
        agrupadas[patente].vehiculo = `${cliente.marca} ${cliente.modelo}`;
        agrupadas[patente].cliente = cliente.nombre;
      }
      agrupadas[patente].tecnicos = Array.from(agrupadas[patente].tecnicos);
    }

    const autosArray = Object.values(agrupadas).sort((a, b) => {
      const aListo = a.ots.some(ot => ot.estado_ot === 'Finalizado');
      const bListo = b.ots.some(ot => ot.estado_ot === 'Finalizado');
      if (aListo &&!bListo) return -1;
      if (!aListo && bListo) return 1;
      return b.diasMaximo - a.diasMaximo;
    });
    setAutosEnTaller(autosArray);
    setMostrarAutosEnTaller(true);
  };

  const abrirOT = async (ot) => {
    setMostrarAutosEnTaller(false);
    try {
      const otCompleta = await api.get(`ordenes_trabajo/${ot.id}`);
      const clientes = await api.get('clientes');
      const cliente = clientes.find(c => c.patente === otCompleta.patente);
      abrirOTEnNuevaVentana(otCompleta, cliente);
    } catch (err) {
      console.error('Error:', err);
    mostrarMensaje('Error al abrir OT', 'error');
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

  const get3DChartOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1f2937',
        borderColor: '#06b6d4',
        borderWidth: 2,
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: '{b}: {c} productos ({d}%)'
      },
      series: [
        {
          name: 'Distribución',
          type: 'pie',
          radius: ['35%', '75%'],
          center: ['50%', '50%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 8,
            borderColor: '#111827',
            borderWidth: 2,
            shadowBlur: 30,
            shadowColor: 'rgba(0, 0, 0, 0.6)'
          },
          label: {
            color: '#e5e7eb',
            fontSize: 11,
            fontWeight: 600,
            formatter: '{b}\n{d}%'
          },
          labelLine: {
            lineStyle: { color: '#6b7280' },
            length: 15,
            length2: 8
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 50,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.9)'
            },
            scale: true,
            scaleSize: 15
          },
          data: dataFamilias.map((f) => ({
            value: f.cantidad,
            name: f.name,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: f.color },
                  { offset: 1, color: f.color + '88' }
                ]
              },
              shadowBlur: 20,
              shadowColor: f.color + '80'
            }
          }))
        }
      ]
    };
  };

  return (
    <div className="p-2 space-y-2">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border-amber-900/30 p-2.5 shadow-lg shadow-amber-900/10">
        <div className="grid grid-cols-5 divide-x divide-gray-700">
          <div className="px-3 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Productos Inventario</div>
            <div className="text-2xl font-bold text-blue-400 leading-tight">{stats.total}</div>
          </div>
          <div className="px-3 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Valor Total Inventario</div>
            <div className="text-xl font-bold text-green-400 leading-tight">{formatearPrecio(stats.valorTotal)}</div>
          </div>
          <div className="px-3 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Stock Bajo</div>
            <div className="text-2xl font-bold text-red-400 leading-tight">{stats.stockBajo}</div>
          </div>
          <div
            onClick={verAutosEnTaller}
            className="px-3 text-center cursor-pointer hover:bg-amber-600/20 transition rounded"
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider">Autos en Taller</div>
            <div className="text-2xl font-bold text-orange-400 leading-tight">{stats.autosEnTaller}</div>
            <div className="text-xs text-gray-500">{stats.otsAbiertas} OT activas</div>
          </div>
          <div className="px-3 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Críticos</div>
            <div className="text-xs font-semibold text-yellow-400 leading-tight">
              {stats.familiasCriticas.length > 0
? stats.familiasCriticas.map(f => `${f.name}: ${f.cant}`).join(' · ')
                : 'Sin críticos'}
            </div>
          </div>
        </div>
      </div>

{/* INGRESOS + ÚLTIMOS FINALIZADOS - CADA COLUMNA CON SU ALTURA */}
<div className="grid grid-cols-12 gap-2">
  <div className="col-span-7 bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg border border-green-900/30 shadow-md h-[500px] flex flex-col">
    <div className="flex items-center gap-2 mb-3 flex-shrink-0">
      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-xl">💵</div>
      <div className="flex items-center justify-between w-full">
  <h3 className="text-sm font-bold text-green-400">Ingresos Taller</h3>
  <button
    onClick={() => setMostrarDetalleIngresos(true)}
    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition"
  >
    Ver detalle
  </button>
</div>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-3 flex-shrink-0">
      <div className="text-center bg-black/20 rounded-lg p-2 border border-green-900/20">
        <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <span>💰</span> HOY
        </div>
        <div className="text-2xl font-black text-green-400">{formatearPrecio(ingresos.hoy)}</div>
      </div>
      <div className="text-center bg-black/20 rounded-lg p-2 border border-emerald-900/20">
        <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <span>📈</span> SEMANA
        </div>
        <div className="text-2xl font-black text-emerald-400">{formatearPrecio(ingresos.semana)}</div>
      </div>
      <div className="text-center bg-black/20 rounded-lg p-2 border border-teal-900/20">
        <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <span>🗓</span> MES
        </div>
        <div className="text-2xl font-black text-teal-400">{formatearPrecio(ingresos.mes)}</div>
      </div>
    </div>

    <div className="bg-black/30 rounded-lg p-2 border border-green-900/10 flex-shrink-0">
      <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Últimos 7 días</div>
{(() => {
        const hoyDate = new Date();
        const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
          const fecha = new Date(hoyDate);
          fecha.setDate(hoyDate.getDate() - (6 - i));
          const key = fecha.toLocaleDateString('es-CL', {
            timeZone: 'America/Santiago',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).split('/').join('-');
          const dia = fecha.toLocaleDateString('es-CL', { weekday: 'short', timeZone: 'America/Santiago' }).toUpperCase().slice(0, 3);
          return {
            dia,
            fecha: key,
            ingreso: porDia[key] || 0
          };
        });

        return (
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={ultimos7Dias} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLineaIngreso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dia"
                stroke="#4b5563"
                tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}
                formatter={(value) => [formatearPrecio(value), 'Ingreso']}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line
                type="monotone"
                dataKey="ingreso"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10b981' }}
                fill="url(#colorLineaIngreso)"
              />
            </LineChart>
          </ResponsiveContainer>
        );
      })()}
    </div>

    {/* LISTOS PARA ENTREGAR - SIN DIAS */}
    <div className="mt-3 bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg border border-amber-700/30 p-3 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
          Listos para Entregar
        </h4>
        <span className="text-[10px] text-gray-500">
          {ots.filter(ot => ot.estado_ot === 'Finalizado').length} esperando retiro
        </span>
      </div>

      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
        {ots.filter(ot => ot.estado_ot === 'Finalizado').length === 0? (
          <div className="text-center py-6 text-gray-600 text-xs">
            ✅ Todo entregado, no hay pendientes
          </div>
        ) : (
          ots.filter(ot => ot.estado_ot === 'Finalizado').map(ot => {
            const cliente = clientes.find(c => c.patente === ot.patente);

            return (
              <div key={ot.id} className="flex items-center justify-between bg-black/30 rounded px-2.5 py-2 hover:bg-black/50 transition group">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="bg-white rounded px-2 py-0.5 flex-shrink-0">
                    <div className="text-black font-black text-xs font-mono">{ot.patente}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold truncate">
                      {cliente?.nombre || 'Sin nombre'}
                    </div>
					</div>
  <div className="text-gray-400 text-[16px] truncate">
    {cliente?.marca} {cliente?.modelo}
  
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-emerald-400 font-bold text-xs">
                    ${Number(ot.monto_final||0).toLocaleString('es-CL')}
                  </div>
                  <button
                    onClick={() => abrirOT(ot)}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition"
                  >
                    Ver OT →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>

  {/* ÚLTIMOS 10 FINALIZADOS */}
  <div className="col-span-5 bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg border border-amber-900/20 shadow-md h-[500px] flex flex-col">
    <div className="flex items-center justify-between mb-3 flex-shrink-0">
      <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
        Últimos 10 Finalizados
      </h3>
      <span className="text-xs text-gray-500">{ultimosFinalizados.length} entregados</span>
    </div>
    <div className="space-y-2 overflow-y-auto flex-1 pr-1">
      {ultimosFinalizados.length === 0? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-3xl mb-2">🚗</div>
          <p className="text-xs">Sin OTs entregadas aún</p>
        </div>
      ) : ultimosFinalizados.map((ot, i) => {
        const fechaEntrega = parsearFechaChile(ot.fecha_entrega);
        const haceDias = Math.floor((Date.now() - fechaEntrega) / (1000 * 60 * 60 * 24));

        return (
          <div
            key={ot.id}
            className="group bg-gray-900/60 hover:bg-gray-900 border border-gray-700/50 hover:border-cyan-500/30 rounded-lg p-2.5 transition-all duration-300 hover:-translate-x-1"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
			  <span className="text-yellow-400 text-xs leading-none -mb-1">⭐</span>
                <div className="relative bg-white rounded px-2.5 py-1 shadow-lg border-2 border-gray-900 flex-shrink-0">
                  <div className="text-black font-black text-base tracking-[0.15em] font-mono leading-none">
                    {ot.patente}
                  </div>
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-bold text-black">
                    ⭐CHILE
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-xs truncate">
                    {ot.cliente_nombre || 'Sin nombre'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                    <span>{haceDias === 0? 'Hoy' : haceDias === 1? 'Ayer' : `${haceDias}d`}</span>
                    {ot.marca && (
                      <>
                        <span>•</span>
                        <span className="truncate">{ot.marca} {ot.modelo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-emerald-400 font-bold text-sm">
                  ${Number(ot.monto_final||ot.monto_estimado||0).toLocaleString('es-CL')}
                </div>
                <div className="text-[8px] text-gray-600 uppercase">
                  {ot.estado_ot}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-6 bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg border-amber-900/20 shadow-md relative">
          <h3 className="text-sm font-bold text-amber-400 mb-1">
            Distribución por Familia ({dataFamilias.length})
          </h3>
          {dataFamilias.length > 0? (
            <ReactECharts
              option={get3DChartOption()}
              style={{ height: '320px' }}
              opts={{ renderer: 'canvas' }}
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 text-sm">No hay datos</div>
          )}
        </div>

        <div className="col-span-6 bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg border border-amber-900/20 shadow-md">
          <h3 className="text-sm font-bold text-amber-400 mb-2">Top 8 Valor por Familia</h3>
          {valorPorFamilia.length > 0? (
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-gray-100 font-bold">Familia</th>
                    <th className="text-center p-2 text-gray-100 font-bold">Prod.</th>
                    <th className="text-right p-2 text-gray-100 font-bold">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {valorPorFamilia.map((f, idx) => (
                    <tr key={f.name} className={idx % 2 === 0? 'bg-gray-900/50' : ''}>
                      <td className="p-2">
                        <span className="px-2 py-1 rounded text-xs font-bold text-white border-2" style={{ backgroundColor: f.color, borderColor: f.color, boxShadow: `0 8px ${f.color}40` }}>
                          {f.name}
                        </span>
                      </td>
                      <td className="text-center p-2 text-gray-100">{f.cantidad}</td>
                      <td className="text-right p-2 font-bold text-green-400">{formatearPrecio(f.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (<div className="h-20 flex items-center justify-center text-gray-500 text-sm">No hay datos</div>)}
        </div>
      </div>

      {mostrarAutosEnTaller && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-[200] p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-amber-700/30 w-full max-w-3xl my-8 shadow-2xl shadow-amber-900/20">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800/95 backdrop-blur z-30 rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold text-orange-400">🚗 Autos en Taller</h2>
                <p className="text-sm text-gray-400 mt-1">{autosEnTaller.length} vehículo(s) con OT activas</p>
              </div>
              <button onClick={() => setMostrarAutosEnTaller(false)} className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 transition">✕</button>
            </div>
            <div className="p-4">
              {autosEnTaller.length > 0? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {autosEnTaller.map((auto) => (
                    <div key={auto.patente} className="bg-gray-900/70 p-3 rounded border border-gray-700 hover:border-amber-700/50 transition-all hover:shadow-lg hover:shadow-amber-900/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-slate-600 rounded text-xs font-bold">{auto.patente}</span>
                            <span className="font-bold text-sm">{auto.vehiculo}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Cliente: {auto.cliente}</div>
                          {auto.tecnicos && auto.tecnicos.length > 0 && (
                            <div className="text-xs text-blue-400 mt-1">👨🔧 A cargo: {auto.tecnicos.join(', ')}</div>
                          )}
                        </div>
                        <div className="text-right flex-col items-end gap-1">
                          <div className="px-2 py-1 bg-orange-600 rounded text-xs font-bold shadow-md">{auto.diasMaximo || 1} día{auto.diasMaximo!== 1? 's' : ''}</div>
                          <div className="text-xs text-gray-500">{auto.ots.length} OT{auto.ots.length!== 1? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        {auto.ots.map((ot) => (
                          <div key={ot.id} className="text-gray-400 flex items-center gap-2 justify-between group">
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${ot.estado_ot === 'Pendiente'? 'bg-yellow-600 text-white' : ot.estado_ot === 'En Proceso'? 'bg-blue-600 text-white' : ot.estado_ot === 'Esperando Repuesto'? 'bg-orange-600 text-white' : ot.estado_ot === 'Finalizado'? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
                                {ot.estado_ot === 'Finalizado'? '✅ Listo para retirar' : ot.estado_ot}
                              </span>
                              {ot.estado_ot === 'Finalizado' && (<span className="text-green-400 italic">esperando al cliente</span>)}
                              <span>{ot.servicios?.join(', ') || 'Sin servicios'}</span>
                            </div>
                            <button onClick={() => abrirOT(ot)} className="opacity-60 group-hover:opacity-100 text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110" title="Ver OT">👁</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<div className="text-center py-8 text-gray-500">No hay autos en taller 🎉</div>)}
            </div>
          </div>
        </div>
      )}

{mostrarDetalleIngresos && (() => {
  const otsFiltradas = ultimosFinalizados.filter(ot => {
    if (!filtroDesde &&!filtroHasta) return true;
    const f = parsearFechaChile(ot.fecha_entrega);
    if (!f) return false;
    if (filtroDesde && f < new Date(filtroDesde)) return false;
    if (filtroHasta && f > new Date(filtroHasta + 'T23:59:59')) return false;
    return true;
  });

  const ahoraChile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  
  // ÚLTIMOS 7 DÍAS
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(ahoraChile);
    fecha.setDate(ahoraChile.getDate() - (6 - i));
    fecha.setHours(0, 0, 0, 0);
    const key = fecha.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).split('/').join('-');
    const total = otsFiltradas.filter(ot => {
      const f = parsearFechaChile(ot.fecha_entrega);
      return f && f.toLocaleDateString('es-CL', {timeZone: 'America/Santiago'}).split('/').join('-') === key;
    }).reduce((s, ot) => s + Number(ot.monto_final||ot.monto_estimado||0), 0);
    return {
      dia: fecha.toLocaleDateString('es-CL', { weekday: 'short', timeZone: 'America/Santiago' }).toUpperCase(),
      fecha: key,
      total,
      fechaObj: fecha
    };
  });
  const total7Dias = ultimos7Dias.reduce((s, d) => s + d.total, 0);

  // ÚLTIMAS 4 SEMANAS
  const ultimas4Semanas = Array.from({ length: 4 }, (_, i) => {
    const finSemana = new Date(ahoraChile);
    finSemana.setDate(ahoraChile.getDate() - (i * 7));
    finSemana.setHours(23, 59, 59, 999);
    const diaSemana = finSemana.getDay();
    const lunesOffset = diaSemana === 0? -6 : 1 - diaSemana;
    const inicioSemana = new Date(finSemana);
    inicioSemana.setDate(finSemana.getDate() + lunesOffset);
    inicioSemana.setHours(0, 0, 0, 0);
    
    const total = otsFiltradas.filter(ot => {
      const f = parsearFechaChile(ot.fecha_entrega);
      return f && f >= inicioSemana && f <= finSemana;
    }).reduce((s, ot) => s + Number(ot.monto_final||ot.monto_estimado||0), 0);
    
    return {
      semana: `Sem ${inicioSemana.getDate()}/${inicioSemana.getMonth()+1}`,
      rango: `${inicioSemana.getDate()}/${inicioSemana.getMonth()+1} - ${finSemana.getDate()}/${finSemana.getMonth()+1}`,
      total
    };
  }).reverse();
  const total4Semanas = ultimas4Semanas.reduce((s, sem) => s + sem.total, 0);

  // MESES DEL AÑO
  const mesesAnio = Array.from({ length: ahoraChile.getMonth() + 1 }, (_, i) => {
    const mes = i;
    const anio = ahoraChile.getFullYear();
    const total = otsFiltradas.filter(ot => {
      const f = parsearFechaChile(ot.fecha_entrega);
      return f && f.getMonth() === mes && f.getFullYear() === anio;
    }).reduce((s, ot) => s + Number(ot.monto_final||ot.monto_estimado||0), 0);
    return {
      mes: new Date(anio, mes).toLocaleDateString('es-CL', { month: 'short', timeZone: 'America/Santiago' }).toUpperCase(),
      total
    };
  });
  const totalMeses = mesesAnio.reduce((s, m) => s + m.total, 0);

  const totalFiltrado = otsFiltradas.reduce((s, ot) => s + Number(ot.monto_final||ot.monto_estimado||0), 0);

  // CONFIG GRÁFICO DETALLADO
  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#10b981',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/><span style="color:#10b981;font-weight:bold">${formatearPrecio(p.value)}</span>`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ultimos7Dias.map(d => d.dia + '\n' + d.fecha.split('-')[0]),
      axisLine: { lineStyle: { color: '#4b5563' } },
      axisLabel: { color: '#9ca3af', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { 
        color: '#6b7280', 
        fontSize: 10,
        formatter: (val) => val >= 1000? `$${(val/1000).toFixed(0)}k` : `$${val}`
      },
      splitLine: { lineStyle: { color: '#1f2937' } }
    },
    series: [{
      data: ultimos7Dias.map(d => d.total),
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#10b981' },
            { offset: 1, color: '#059669' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params) => params.value > 0? formatearPrecio(params.value) : '',
        color: '#10b981',
        fontSize: 9,
        fontWeight: 'bold'
      }
    }]
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-[200] p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-green-700/30 w-full max-w-6xl my-8 shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800/95 backdrop-blur z-30 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-green-400">💵 Resumen de Ingresos</h2>
            <p className="text-sm text-gray-400 mt-1">
              {otsFiltradas.length} OT(s) • Total: <span className="text-emerald-400 font-bold">{formatearPrecio(totalFiltrado)}</span>
            </p>
          </div>
          <button onClick={() => setMostrarDetalleIngresos(false)} className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 transition">✕</button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4 items-end">
            <div>
              <label className="text-xs text-gray-400">Desde</label>
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="block bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Hasta</label>
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="block bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <button
              onClick={() => { setFiltroDesde(''); setFiltroHasta(''); }}
              className="px-3 py-1 bg-gray-600 rounded text-xs hover:bg-gray-700"
            >
              Limpiar
            </button>
            {(filtroDesde || filtroHasta) && (
              <div className="ml-auto bg-black/40 border border-green-700/30 rounded-lg px-4 py-2">
                <div className="text-xs text-gray-400 uppercase">Total intervalo</div>
                <div className="text-2xl font-black text-emerald-400">{formatearPrecio(totalFiltrado)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-black/30 rounded-lg p-3 border border-green-900/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-400 uppercase">Últimos 7 días</div>
                <div className="text-sm font-bold text-emerald-400">{formatearPrecio(total7Dias)}</div>
              </div>
              <div className="space-y-1.5">
                {ultimos7Dias.map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{d.dia} {d.fecha}</span>
                    <span className={`font-bold ${d.total > 0? 'text-emerald-400' : 'text-gray-600'}`}>
                      {formatearPrecio(d.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-3 border border-emerald-900/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-400 uppercase">Últimas 4 semanas</div>
                <div className="text-sm font-bold text-emerald-400">{formatearPrecio(total4Semanas)}</div>
              </div>
              <div className="space-y-1.5">
                {ultimas4Semanas.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div>
                      <div className="text-gray-300 font-semibold">{s.semana}</div>
                      <div className="text-gray-600 text-">{s.rango}</div>
                    </div>
                    <span className={`font-bold ${s.total > 0? 'text-emerald-400' : 'text-gray-600'}`}>
                      {formatearPrecio(s.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-3 border border-teal-900/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-400 uppercase">Meses {ahoraChile.getFullYear()}</div>
                <div className="text-sm font-bold text-emerald-400">{formatearPrecio(totalMeses)}</div>
              </div>
              <div className="space-y-1.5 max-h- overflow-y-auto">
                {mesesAnio.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{m.mes}.</span>
                    <span className={`font-bold ${m.total > 0? 'text-emerald-400' : 'text-gray-600'}`}>
                      {formatearPrecio(m.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-3 border border-gray-700 mb-4">
            <div className="text-xs text-gray-400 uppercase mb-2">Gráfico últimos 7 días</div>
            <ReactECharts option={chartOption} style={{ height: '200px' }} />
          </div>

          <div className="bg-black/20 rounded-lg p-2 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase mb-2">Detalle OT Filtradas ({otsFiltradas.length})</div>
            <div className="space-y-1.5 max-h- overflow-y-auto pr-1">
              {otsFiltradas.sort((a,b) => parsearFechaChile(b.fecha_entrega) - parsearFechaChile(a.fecha_entrega)).map((ot) => (
                <div key={ot.id} className="flex justify-between items-center bg-gray-900/50 p-2 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <div className="bg-white rounded px-1.5 py-0.5">
                      <div className="text-black font-black text- font-mono">{ot.patente}</div>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{ot.cliente_nombre || 'Sin nombre'}</div>
                      <div className="text-gray-500 text-">
                        {new Date(ot.fecha_entrega).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    {formatearPrecio(Number(ot.monto_final||ot.monto_estimado||0))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})()}

      {otEditando && (
        <OrdenTrabajoForm otExistente={otEditando} onGuardar={() => { cargarDatos(); setOtEditando(null); }} onCerrar={() => setOtEditando(null)} onIrAClientes={() => setActiveTab('clientes')} />
      )}
    </div>
  );
}


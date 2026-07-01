import { formatearPrecio } from '../utils/calculations';

export default function OTVisualizarModal({ ot, cliente, onCerrar }) {
  const fechaHoy = new Date().toLocaleDateString('es-CL');
  const neto = ot.monto_final || ot.monto_estimado || 0;
  const iva = Math.round(neto * 0.19);
  const total = neto + iva;
  const abono = Number(ot.abono) || 0;
  const saldo = total - abono;

  const handleImprimir = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ot-print, #ot-print * {
            visibility: visible;
          }
          #ot-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
        .no-print {
            display: none!important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        @page {
          size: letter;
          margin: 10mm;
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[200] p-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-5xl max-h-screen overflow-hidden flex flex-col">
          {/* Botones - no se imprimen */}
          <div className="p-3 border-b border-gray-700 flex justify-between items-center no-print">
            <h3 className="text-lg font-bold">Orden de Trabajo #{ot.id}</h3>
            <div className="flex gap-2">
              <button
                onClick={handleImprimir}
                className="px-4 py-2 bg-blue-600 rounded font-bold hover:bg-blue-700"
              >
                🖨 Imprimir / PDF
              </button>
              <button onClick={onCerrar} className="px-4 py-2 bg-gray-600 rounded font-bold hover:bg-gray-700">
                ✕ Cerrar
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div id="ot-print" className="flex-1 overflow-y-auto bg-white text-black p-8" style={{ fontFamily: 'Segoe UI, Arial, sans-serif' }}>
            {/* Header con Logo */}
            <div className="flex justify-between items-start mb-4 pb-3" style={{ borderBottom: '3px solid #dc2626' }}>
              <div className="flex items-center gap-4">
                <div style={{
                  background: 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                }}>
                  <img
                    src="/BB.png"
                    alt="Balladares Motors"
                    style={{ height: '65px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-red-600 tracking-tight" style={{ letterSpacing: '-0.5px' }}>
                    BALLADARES MOTORS
                  </h1>
                  <p className="text-xs font-bold text-gray-700 mt-1">RODOLFO BRICEÑO #2718, CONCEPCIÓN</p>
                  <p className="text-xs text-gray-500">Taller Mecánico Integral</p>
                </div>
              </div>
              <div className="text-right">
                <div style={{
                  background: 'linear-gradient(180deg, #000 0%, #1f2937 100%)',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  <div className="text-xs opacity-90">RUT: 76.932.509-3</div>
                  <div className="text-3xl font-black tracking-tighter">OT {ot.id}</div>
                </div>
              </div>
            </div>

            {/* Datos Cliente con fondo gris */}
            <div style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              padding: '10px',
              borderRadius: '6px',
              borderLeft: '4px solid #06b6d4',
              marginBottom: '15px',
              fontSize: '9pt'
            }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1">
                    <strong style={{ display: 'inline-block', minWidth: '75px', color: '#374151' }}>PARA:</strong>
                    <span style={{ borderBottom: '1px solid #9ca3af', display: 'inline-block', minWidth: '180px', paddingBottom: '2px' }}>
                      {cliente.nombre}
                    </span>
                  </div>
                  <div className="mb-1">
                    <strong style={{ display: 'inline-block', minWidth: '75px', color: '#374151' }}>MODELO:</strong>
                    <span style={{ borderBottom: '1px solid #9ca3af', display: 'inline-block', minWidth: '180px', paddingBottom: '2px' }}>
                      {cliente.marca} {cliente.modelo}
                    </span>
                  </div>
                  <div>
                    <strong style={{ display: 'inline-block', minWidth: '75px', color: '#374151' }}>PATENTE:</strong>
                    <span style={{ borderBottom: '1px solid #9ca3af', display: 'inline-block', minWidth: '180px', paddingBottom: '2px', fontWeight: 'bold' }}>
                      {cliente.patente}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="mb-1">
                    <strong style={{ display: 'inline-block', minWidth: '75px', color: '#374151' }}>ATENCION:</strong>
                    <span style={{ borderBottom: '1px solid #9ca3af', display: 'inline-block', minWidth: '180px', paddingBottom: '2px' }}>
                      {ot.tecnico_asignado || 'CARLOS BALLADARES'}
                    </span>
                  </div>
                  <div className="mb-1">
                    <strong style={{ display: 'inline-block', minWidth: '75px', color: '#374151' }}>FECHA:</strong>
                    <span style={{ borderBottom: '1px solid #9ca3af', display: 'inline-block', minWidth: '180px', paddingBottom: '2px' }}>
                      {fechaHoy}
                    </span>
                  </div>
                  <div>
                    <strong style={{ display: 'inline-block', minWidth: '75px', color: '#374151' }}>TELEFONO:</strong>
                    <span style={{ borderBottom: '1px solid #9ca3af', display: 'inline-block', minWidth: '180px', paddingBottom: '2px' }}>
                      {cliente.celular}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Extra: KM y Checklist */}
            {(ot.kilometraje || (ot.checklist_recepcion && ot.checklist_recepcion.length > 0)) && (
              <div style={{
                background: '#fef3c7',
                padding: '8px 10px',
                marginBottom: '12px',
                border: '1px solid #f59e0b',
                borderLeft: '4px solid #f59e0b',
                fontSize: '8pt',
                borderRadius: '4px'
              }}>
                {ot.kilometraje > 0 && (
                  <div style={{ margin: '2px 0' }}>
                    <strong style={{ display: 'inline-block', minWidth: '95px', color: '#92400e' }}>Kilometraje:</strong>
                    {ot.kilometraje.toLocaleString('es-CL')} KM
                  </div>
                )}
                {ot.checklist_recepcion && ot.checklist_recepcion.length > 0 && (
                  <div style={{ margin: '2px 0' }}>
                    <strong style={{ display: 'inline-block', minWidth: '95px', color: '#92400e' }}>Checklist:</strong>
                    {ot.checklist_recepcion.map(c => `${c.item}${c.obs? ` (${c.obs})` : ''}`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Tabla Servicios */}
            <table className="w-full border-collapse mb-4" style={{ fontSize: '9pt', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{
                  background: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
                  color: 'white'
                }}>
                  <th className="border border-black p-2 text-left" style={{ fontSize: '8pt', textTransform: 'uppercase', fontWeight: '700' }}>
                    DESCRIPCIÓN
                  </th>
                  <th className="border border-black p-2 text-center w-20" style={{ fontSize: '8pt', textTransform: 'uppercase', fontWeight: '700' }}>
                    CANT
                  </th>
                  <th className="border border-black p-2 text-right w-32" style={{ fontSize: '8pt', textTransform: 'uppercase', fontWeight: '700' }}>
                    VALOR UNIT
                  </th>
                  <th className="border border-black p-2 text-right w-32" style={{ fontSize: '8pt', textTransform: 'uppercase', fontWeight: '700' }}>
                    VALOR TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {ot.servicios && ot.servicios.length > 0 && (
                  <>
                    <tr style={{
                      background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '9pt',
                      letterSpacing: '0.5px'
                    }}>
                      <td colSpan="4" className="border border-black p-2">SERVICIOS REALIZADOS</td>
                    </tr>
                    {ot.servicios?.map((serv, idx) => {
                      const valorUnit = Math.round(neto / ot.servicios.length);
                      return (
                        <tr key={idx} style={{ background: idx % 2 === 0? '#f9fafb' : 'white' }}>
                          <td className="border border-gray-300 p-2">{serv}</td>
                          <td className="border border-gray-300 p-2 text-center">1</td>
                          <td className="border border-gray-300 p-2 text-right">{formatearPrecio(valorUnit)}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatearPrecio(valorUnit)}</td>
                        </tr>
                      );
                    })}
                  </>
                )}

                {ot.repuestos_usados && ot.repuestos_usados.length > 0 && (
                  <>
                    <tr style={{
                      background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '9pt',
                      letterSpacing: '0.5px'
                    }}>
                      <td colSpan="4" className="border border-black p-2">REPUESTOS UTILIZADOS</td>
                    </tr>
                    {ot.repuestos_usados.map((rep, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0? '#f9fafb' : 'white' }}>
                        <td className="border border-gray-300 p-2">
                          {rep.nombre} {rep.sku!== 'MANUAL'? `(${rep.sku})` : ''}
                          {!rep.desde_inventario && (
                            <span style={{
                              display: 'inline-block',
                              background: '#f59e0b',
                              color: 'white',
                              fontSize: '6pt',
                              padding: '1px 3px',
                              borderRadius: '2px',
                              marginLeft: '3px',
                              fontWeight: '600'
                            }}>EXT</span>
                          )}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">{rep.cantidad}</td>
                        <td className="border border-gray-300 p-2 text-right">{formatearPrecio(rep.precio_venta)}</td>
                        <td className="border border-gray-300 p-2 text-right">{formatearPrecio(rep.precio_venta * rep.cantidad)}</td>
                      </tr>
                    ))}
                  </>
                )}

                {ot.mano_obra && ot.mano_obra.length > 0 && (
                  <>
                    <tr style={{
                      background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '9pt',
                      letterSpacing: '0.5px'
                    }}>
                      <td colSpan="4" className="border border-black p-2">MANO DE OBRA H/H</td>
                    </tr>
                    {ot.mano_obra.map((mo, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0? '#f9fafb' : 'white' }}>
                        <td className="border border-gray-300 p-2">{mo.descripcion}</td>
                        <td className="border border-gray-300 p-2 text-center">{mo.cantidad}</td>
                        <td className="border border-gray-300 p-2 text-right">{formatearPrecio(mo.valor_unit)}</td>
                        <td className="border border-gray-300 p-2 text-right">{formatearPrecio(mo.valor_unit * mo.cantidad)}</td>
                      </tr>
                    ))}
                  </>
                )}

                {ot.descripcion_servicio && (
                  <tr>
                    <td className="border border-gray-300 p-2 text-sm" colSpan="4">
                      <strong>Observaciones:</strong> {ot.descripcion_servicio}
                    </td>
                  </tr>
                )}
                {/* Filas vacías para rellenar */}
                {[...Array(Math.max(0, 3 - ((ot.servicios?.length || 0) + (ot.repuestos_usados?.length || 0) + (ot.mano_obra?.length || 0))))].map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-gray-300 p-2">&nbsp;</td>
                    <td className="border border-gray-300 p-2">&nbsp;</td>
                    <td className="border border-gray-300 p-2">&nbsp;</td>
                    <td className="border border-gray-300 p-2">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Finales: Firma + Totales */}
            <div className="flex justify-between items-start mt-6 mb-6" style={{ gap: '20px' }}>
              <div style={{
                textAlign: 'left',
                fontWeight: '700',
                fontSize: '10pt',
                lineHeight: '1.6',
                paddingTop: '10px',
                color: '#1f2937'
              }}>
                <p style={{ margin: '2px 0' }}>ATTE.</p>
                <p style={{ margin: '2px 0' }}>{ot.tecnico_asignado || 'CARLOS BALLADARES'}</p>
                <p style={{ margin: '2px 0' }}>INGENIERO MECANICO</p>
              </div>

              <div className="w-64">
                <table className="border-collapse w-full" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  <tbody>
                    <tr>
                      <td className="pr-4 text-right font-bold" style={{ padding: '4px 8px', fontSize: '9pt' }}>NETO</td>
                      <td className="border border-black px-4 py-1 text-right w-40" style={{ padding: '4px 8px', fontSize: '9pt' }}>
                        {formatearPrecio(neto)}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 text-right font-bold" style={{ padding: '4px 8px', fontSize: '9pt' }}>IVA 19%</td>
                      <td className="border border-black px-4 py-1 text-right" style={{ padding: '4px 8px', fontSize: '9pt' }}>
                        {formatearPrecio(iva)}
                      </td>
                    </tr>
                    <tr style={{
                      background: 'linear-gradient(135deg, #000 0%, #1f2937 100%)',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '11pt'
                    }}>
                      <td className="pr-4 text-right font-bold" style={{ padding: '4px 8px' }}>TOTAL</td>
                      <td className="border border-black px-4 py-2 text-right font-bold text-lg" style={{ padding: '4px 8px' }}>
                        {formatearPrecio(total)}
                      </td>
                    </tr>
                    <tr style={{ background: '#dcfce7', fontWeight: '700' }}>
                      <td className="pr-4 text-right font-bold" style={{ padding: '4px 8px', fontSize: '9pt' }}>ABONO</td>
                      <td className="border border-black px-4 py-1 text-right" style={{ padding: '4px 8px', fontSize: '9pt' }}>
                        {abono > 0? formatearPrecio(abono) : '___________'}
                      </td>
                    </tr>
                    {abono > 0 && (
                      <tr style={{ background: '#dbeafe', fontWeight: '700', fontSize: '10pt' }}>
                        <td className="pr-4 text-right font-bold" style={{ padding: '4px 8px' }}>SALDO</td>
                        <td className="border border-black px-4 py-1 text-right" style={{ padding: '4px 8px' }}>
                          {formatearPrecio(saldo)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 pt-3" style={{
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              fontSize: '7pt',
              color: '#9ca3af'
            }}>
              BALLADARES MOTORS - RUT: 76.932.509-3<br />
              Sistema de Gestión Taller Mecánico
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
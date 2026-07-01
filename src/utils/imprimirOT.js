import { formatearPrecio } from '../utils/calculations';

const calcularTotales = (ot) => {
  const totalRepuestos = (ot.repuestos_usados || []).reduce((sum, rep) => {
    // Lee cualquiera de los 3 campos, en orden de prioridad
    const precioUnit = Number(rep.precio_venta || rep.valor_unitario || rep.precio_unitario || 0);
    const cant = Number(rep.cantidad || 0);
    return sum + (precioUnit * cant);
  }, 0);
  
  const totalManoObra = (ot.mano_obra || []).reduce((sum, mo) => {
    const precioUnit = Number(mo.valor_unit || mo.precio || mo.valor_total || 0);
    const cant = Number(mo.cantidad || 1);
    return sum + (precioUnit * cant);
  }, 0);
  
  const subtotal = totalRepuestos + totalManoObra;
  const neto = Math.round(subtotal / 1.19);
  const iva = subtotal - neto;
  
  return { neto, iva, total: subtotal };
};

export function abrirOTEnNuevaVentana(ot, cliente) {
  const fechaHoy = new Date().toLocaleDateString('es-CL');
  const { neto, iva, total } = calcularTotales(ot);
  const abono = Number(ot.abono) || 0;
  const saldo = total - abono;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>OT ${ot.id} - ${cliente.patente}</title>
      <link rel="preload" href="/BB.png" as="image" fetchpriority="high">
      <style>
        @page {
          size: letter;
          margin: 10mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 10pt;
          color: #1f2937;
          background: white;
        }
        .toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #1f2937;
          padding: 10px;
          display: flex;
          gap: 10px;
          justify-content: center;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .toolbar button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-print {
          background: #2563eb;
          color: white;
        }
        .btn-print:hover {
          background: #1d4ed8;
        }
        .btn-close {
          background: #dc2626;
          color: white;
        }
        .btn-close:hover {
          background: #b91c1c;
        }
        .container {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 50px auto 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          border-bottom: 3px solid #dc2626;
          padding-bottom: 12px;
          gap: 20px;
        }
        .logo-container {
          background: linear-gradient(135deg, #374151 0%, #4B5563 100%);
          padding: 10px 18px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          width: 420px;
          flex: none;
        }
        .logo-bb {
          width: 100%;
          height: 75px;
          object-fit: fill;
        }
        .empresa-direccion {
          font-size: 9pt;
          font-weight: bold;
          margin-top: 6px;
          color: #ffffff;
          text-align: center;
          letter-spacing: 0.5px;
        }
        .ot-box {
          background: linear-gradient(180deg, #000 0%, #1f2937 100%);
          color: white;
          padding: 8px 18px;
          text-align: center;
          flex-shrink: 0;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .ot-box.rut {
          font-size: 8pt;
          margin-bottom: 4px;
          opacity: 0.9;
        }
        .ot-box.numero {
          font-size: 22pt;
          font-weight: 800;
          letter-spacing: -1px;
        }
        .datos-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 15px;
          font-size: 9pt;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          padding: 10px;
          border-radius: 6px;
          border-left: 4px solid #06b6d4;
        }
        .dato {
          margin-bottom: 6px;
        }
        .dato strong {
          display: inline-block;
          min-width: 75px;
          color: #374151;
        }
        .dato span {
          border-bottom: 1px solid #9ca3af;
          display: inline-block;
          min-width: 180px;
          padding-bottom: 2px;
          color: #1f2937;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 9pt;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        table th {
          background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
          color: white;
          padding: 7px;
          text-align: left;
          border: 1px solid #000;
          font-size: 8pt;
          text-transform: uppercase;
          font-weight: 700;
        }
        table td {
          padding: 5px 7px;
          border: 1px solid #d1d5db;
        }
        tr:nth-child(even) {
          background: #f9fafb;
        }
        .franja-roja {
          background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)!important;
          color: white!important;
          font-weight: 700;
          font-size: 9pt;
          letter-spacing: 0.5px;
        }
        .centro {
          text-align: center;
        }
        .derecha {
          text-align: right;
        }
        .finales {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 25px;
          margin-bottom: 25px;
          gap: 20px;
        }
        .firma-texto {
          text-align: left;
          font-weight: 700;
          font-size: 10pt;
          line-height: 1.6;
          padding-top: 10px;
          color: #1f2937;
        }
        .firma-texto p {
          margin: 2px 0;
        }
        .totales {
          width: 280px;
        }
        .totales table {
          margin-bottom: 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .totales td {
          padding: 4px 8px;
          font-size: 9pt;
        }
        .total-final {
          background: linear-gradient(135deg, #000 0%, #1f2937 100%);
          color: white;
          font-weight: 800;
          font-size: 11pt;
        }
        .abono-fila {
          background: #dcfce7;
          font-weight: 700;
        }
        .saldo-fila {
          background: #dbeafe;
          font-weight: 700;
          font-size: 10pt;
        }
        .info-extra {
          background: #fef3c7;
          padding: 8px 10px;
          margin-bottom: 12px;
          border: 1px solid #f59e0b;
          border-left: 4px solid #f59e0b;
          font-size: 8pt;
          border-radius: 4px;
        }
        .info-extra div {
          margin: 2px 0;
        }
        .info-extra strong {
          display: inline-block;
          min-width: 95px;
          color: #92400e;
        }
        .badge-externo {
          display: inline-block;
          background: #f59e0b;
          color: white;
          font-size: 6pt;
          padding: 1px 3px;
          border-radius: 2px;
          margin-left: 3px;
          font-weight: 600;
        }
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 7pt;
          color: #9ca3af;
        }
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .toolbar {
            display: none;
          }
          .container {
            margin: 0 auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
        <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
      </div>

      <div class="container">
        <!-- HEADER CON LOGO BB ESTIRADO -->
        <div class="header">
          <div class="logo-container">
            <img src="/BB.png" alt="Balladares Motors" class="logo-bb" loading="eager" />
            <p class="empresa-direccion">RODOLFO BRICEÑO #2718, CONCEPCIÓN</p>
          </div>
          <div class="ot-box">
            <div class="rut">RUT: 76.932.509-3</div>
            <div class="numero">OT ${ot.id}</div>
          </div>
        </div>

        <!-- Datos Cliente -->
        <div class="datos-grid">
          <div>
            <div class="dato"><strong>PARA:</strong> <span>${cliente.nombre}</span></div>
            <div class="dato"><strong>MODELO:</strong> <span>${cliente.marca} ${cliente.modelo}</span></div>
            <div class="dato"><strong>PATENTE:</strong> <span style="font-weight: bold;">${cliente.patente}</span></div>
          </div>
          <div>
            <div class="dato"><strong>ATENCION:</strong> <span>${ot.tecnico_asignado || 'CARLOS BALLADARES'}</span></div>
            <div class="dato"><strong>FECHA:</strong> <span>${fechaHoy}</span></div>
            <div class="dato"><strong>TELEFONO:</strong> <span>${cliente.celular}</span></div>
          </div>
        </div>

        <!-- Info Extra: KM, Checklist -->
        ${(ot.kilometraje || (ot.checklist_recepcion && ot.checklist_recepcion.length > 0))? `
        <div class="info-extra">
          ${ot.kilometraje > 0? `<div><strong>Kilometraje:</strong> ${ot.kilometraje.toLocaleString('es-CL')} KM</div>` : ''}
          ${ot.checklist_recepcion && ot.checklist_recepcion.length > 0? `
            <div><strong>Checklist Recepción:</strong> ${ot.checklist_recepcion.map(c => `${c.item}${c.obs ? ` (${c.obs})` : ''}`).join(', ')}</div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Tabla Detalle -->
        <table>
          <thead>
            <tr>
              <th>DESCRIPCIÓN</th>
              <th class="centro" style="width: 70px;">CANT</th>
              <th class="derecha" style="width: 100px;">VALOR UNIT</th>
              <th class="derecha" style="width: 100px;">VALOR TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <!-- PRIMERO REPUESTOS - IGUAL QUE EL FORM -->
            ${ot.repuestos_usados && ot.repuestos_usados.length > 0? `
            <tr class="franja-roja">
              <td colspan="4">REPUESTOS UTILIZADOS</td>
            </tr>
            ${ot.repuestos_usados.map(rep => {
              const precioUnit = Number(rep.precio_venta || rep.valor_unitario || rep.precio_unitario || 0);
              const cant = Number(rep.cantidad || 0);
              const subtotal = Number(rep.valor_total || rep.subtotal || 0) || (precioUnit * cant);
              const nombre = rep.descripcion || rep.nombre || 'Sin descripción';
              
              return `
              <tr>
                <td>${nombre} ${rep.sku && rep.sku !== 'MANUAL' ? `(${rep.sku})` : ''} ${!rep.desde_inventario && !rep.desde_retiro ? '<span class="badge-externo">EXT</span>' : ''}</td>
                <td class="centro">${cant}</td>
                <td class="derecha">${formatearPrecio(precioUnit)}</td>
                <td class="derecha">${formatearPrecio(subtotal)}</td>
              </tr>
              `;
            }).join('')}
            ` : ''}

            <!-- DESPUÉS MANO DE OBRA - IGUAL QUE EL FORM -->
            ${ot.mano_obra && ot.mano_obra.length > 0? `
            <tr class="franja-roja">
              <td colspan="4">MANO DE OBRA H/H</td>
            </tr>
            ${ot.mano_obra.map(mo => {
              const precioUnit = Number(mo.valor_unit || mo.precio || mo.valor_total || 0);
              const cant = Number(mo.cantidad || 1);
              return `
              <tr>
                <td>${mo.descripcion}</td>
                <td class="centro">${cant}</td>
                <td class="derecha">${formatearPrecio(precioUnit)}</td>
                <td class="derecha">${formatearPrecio(precioUnit * cant)}</td>
              </tr>
              `;
            }).join('')}
            ` : ''}

            ${ot.descripcion_servicio? `
            <tr>
              <td colspan="4" style="font-size: 8pt;">
                <strong>Observaciones:</strong> ${ot.descripcion_servicio}
              </td>
            </tr>
            ` : ''}

            <!-- Filas vacías -->
            ${[...Array(Math.max(0, 3))].map(() => `
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- FINALES: FIRMA + TOTALES CON ABONO Y SALDO -->
        <div class="finales">
          <div class="firma-texto">
            <p>ATTE.</p>
            <p>CARLOS BALLADARES</p>
            <p>INGENIERO MECANICO</p>
          </div>

          <div class="totales">
            <table>
              <tbody>
                <tr>
                  <td class="derecha" style="font-weight: 700;">NETO</td>
                  <td class="derecha" style="border: 1px solid #000; width: 130px;">${formatearPrecio(neto)}</td>
                </tr>
                <tr>
                  <td class="derecha" style="font-weight: 700;">IVA 19%</td>
                  <td class="derecha" style="border: 1px solid #000;">${formatearPrecio(iva)}</td>
                </tr>
                <tr class="total-final">
                  <td class="derecha">TOTAL</td>
                  <td class="derecha" style="border: 1px solid #000;">${formatearPrecio(total)}</td>
                </tr>
                <tr class="abono-fila">
                  <td class="derecha" style="font-weight: 700;">ABONO</td>
                  <td class="derecha" style="border: 1px solid #000;">
                    ${abono > 0 ? formatearPrecio(abono) : '___________'}
                  </td>
                </tr>
                ${abono > 0 ? `
                <tr class="saldo-fila">
                  <td class="derecha">SALDO</td>
                  <td class="derecha" style="border: 1px solid #000;">${formatearPrecio(saldo)}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <div class="footer">
          BALLADARES MOTORS - RUT: 76.932.509-3<br>
          Sistema de Gestión Taller Mecánico
        </div>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank', 'width=900,height=1200');
  ventana.document.write(html);
  ventana.document.close();
}
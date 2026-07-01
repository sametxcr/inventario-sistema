import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { APP_CONFIG } from '../config/app';

const formatearPrecio = (num) => `$${Math.round(num).toLocaleString('es-CL')}`;

export const generarPDFCotizacion = async (datos, productos, enBlanco = false) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const { empresa } = APP_CONFIG;
  
  let y = 20;
  
  doc.setFontSize(18);
  doc.text('COTIZACIÓN', pageWidth/2, y, { align: 'center' });
  y += 12;
  
  // Header empresa
  doc.setFontSize(10);
  if(empresa.nombre) {
    doc.setFont(undefined, 'bold');
    doc.text(empresa.nombre, 15, y);
    doc.setFont(undefined, 'normal');
    y += 5;
  }
  if(empresa.rut) { doc.text(`RUT: ${empresa.rut}`, 15, y); y += 5; }
  if(empresa.direccion) { doc.text(empresa.direccion, 15, y); y += 5; }
  
  const numCotiz = `COT-${Date.now()}`;
  doc.setFont(undefined, 'bold');
  doc.text(`N°: ${numCotiz}`, pageWidth - 15, 32, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, pageWidth - 15, 37, { align: 'right' });
  doc.text(`Validez: ${datos.validez || 15} días`, pageWidth - 15, 42, { align: 'right' });
  
  y = Math.max(y, 50);
  doc.setFont(undefined, 'bold');
  doc.text(`Cliente: ${datos.cliente || '____________________'}`, 15, y);
  y += 10;
  
  const body = enBlanco 
    ? Array(18).fill(['', '', '', '', '', '', ''])
    : productos.map(p => [
        p.sku,
        p.nombre.substring(0, 40),
        p.familia.substring(0, 15),
        p.stock_total || '-',
        formatearPrecio(p.precio_venta),
        p.cantidad,
        formatearPrecio(p.precio_venta * p.cantidad)
      ]);
  
  doc.autoTable({
    startY: y,
    head: [['SKU', 'Descripción', 'Familia', 'Stock', 'P. Unitario', 'Cant.', 'Total']],
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [52, 73, 94] },
    styles: { fontSize: 8 }
  });
  
  if (!enBlanco && productos.length > 0) {
    const total = productos.reduce((sum, p) => sum + p.precio_venta * p.cantidad, 0);
    const neto = total / 1.19;
    const iva = total - neto;
    const finalY = doc.lastAutoTable.finalY + 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`NETO: ${formatearPrecio(neto)}`, pageWidth - 15, finalY, { align: 'right' });
    doc.text(`IVA 19%: ${formatearPrecio(iva)}`, pageWidth - 15, finalY + 6, { align: 'right' });
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: ${formatearPrecio(total)}`, pageWidth - 15, finalY + 12, { align: 'right' });
  }
  
  doc.save(`Cotizacion_${datos.cliente || 'BLANCO'}_${Date.now()}.pdf`);
};
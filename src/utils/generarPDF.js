import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_CONFIG } from '../config/app';
import { formatearPrecio } from './calculations';

// Convierte imagen a base64
const cargarLogo = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error cargando logo:', err);
    return null;
  }
};

export const generarPDFCotizacion = async (itemsCotizacion, cliente, validezDias = 7) => {
  const doc = new jsPDF();
  const { empresa } = APP_CONFIG;
  
  // Cargar logo
  const logoBase64 = await cargarLogo('/BB.png');
  
  // HEADER CON LOGO
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 8, 55, 22);
  }
  
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.setFont(undefined, 'bold');
  doc.text(empresa.nombre || 'BALLADARES MOTORS', 75, 16);
  
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont(undefined, 'normal');
  doc.text(`RUT: ${empresa.rut || '76.XXX.XXX-X'}`, 75, 21);
  doc.text(empresa.direccion || 'RODOLFO BRICEÑO #2718, CONCEPCIÓN', 75, 26);
  
  // Box cotización derecha
  doc.setFillColor(31, 41, 55);
  doc.rect(145, 8, 50, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('COTIZACIÓN', 170, 14, { align: 'center' });
  doc.setFontSize(14);
  const numCotiz = `COT-${Date.now().toString().slice(-6)}`;
  doc.text(numCotiz, 170, 22, { align: 'center' });
  
  // Línea roja
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.8);
  doc.line(15, 35, 195, 35);
  
  // Fechas
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 195, 40, { align: 'right' });
  const fechaValidez = new Date();
  fechaValidez.setDate(fechaValidez.getDate() + validezDias);
  doc.text(`Válida hasta: ${fechaValidez.toLocaleDateString('es-CL')}`, 195, 45, { align: 'right' });
  
  // DATOS CLIENTE con fondo gris
  let y = 52;
  doc.setFillColor(243, 244, 246);
  doc.rect(15, y, 180, 20, 'F');
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(1);
  doc.line(15, y, 15, y + 20);
  
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Cliente:', 18, y + 6);
  doc.setFont(undefined, 'normal');
  doc.text(cliente.nombre, 38, y + 6);
  
  doc.setFont(undefined, 'bold');
  doc.text('RUT:', 18, y + 11);
  doc.setFont(undefined, 'normal');
  doc.text(cliente.rut, 38, y + 11);
  
  doc.setFont(undefined, 'bold');
  doc.text('Celular:', 18, y + 16);
  doc.setFont(undefined, 'normal');
  doc.text(cliente.celular || 'N/A', 38, y + 16);
  
  doc.setFont(undefined, 'bold');
  doc.text('Vehículo:', 105, y + 6);
  doc.setFont(undefined, 'normal');
  doc.text(`${cliente.marca} ${cliente.modelo}`, 128, y + 6);
  
  doc.setFont(undefined, 'bold');
  doc.text('Patente:', 105, y + 11);
  doc.setFont(undefined, 'normal');
  doc.text(cliente.patente, 128, y + 11);
  
  doc.setFont(undefined, 'bold');
  doc.text('Año:', 105, y + 16);
  doc.setFont(undefined, 'normal');
  doc.text(cliente.anio || 'N/A', 128, y + 16);
  
  y += 28;
  
  // TABLA PRODUCTOS
  const body = itemsCotizacion.map(item => [
    item.sku,
    item.nombre.substring(0, 40),
    item.familia?.substring(0, 15) || '-',
    item.stock_total || '-',
    formatearPrecio(item.precio_venta),
    item.cantidad,
    formatearPrecio(item.precio_venta * item.cantidad)
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['SKU', 'Descripción', 'Familia', 'Stock', 'P. Unit', 'Cant', 'Subtotal']],
    body: body,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { 
      fillColor: [31, 41, 55], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 60 },
      2: { cellWidth: 23 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 23, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' }
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  
  // TOTALES
  const total = itemsCotizacion.reduce((sum, p) => sum + (p.precio_venta * p.cantidad), 0);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  const finalY = doc.lastAutoTable.finalY + 8;
  
  // Box totales
  doc.setFillColor(31, 41, 55);
  doc.roundedRect(120, finalY, 75, 30, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('NETO:', 125, finalY + 7);
  doc.text(formatearPrecio(neto), 190, finalY + 7, { align: 'right' });
  
  doc.text('IVA 19%:', 125, finalY + 13);
  doc.text(formatearPrecio(iva), 190, finalY + 13, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('TOTAL:', 125, finalY + 22);
  doc.text(formatearPrecio(total), 190, finalY + 22, { align: 'right' });
  
  // Condiciones
  doc.setFillColor(254, 243, 199);
  doc.rect(15, finalY + 38, 180, 18, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.rect(15, finalY + 38, 1.5, 18, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.setFont(undefined, 'bold');
  doc.text('⚠ CONDICIONES:', 18, finalY + 43);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`- Válida por ${validezDias} días - Precios con IVA incluido - Stock sujeto a disponibilidad`, 18, finalY + 48);
  doc.text('- Items externos requieren validación previa', 18, finalY + 53);
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`${empresa.nombre} - ${empresa.rut} - Sistema de Gestión Taller Mecánico`, 105, 285, { align: 'center' });
  
  doc.save(`cotizacion-${cliente.patente}-${new Date().toISOString().split('T')[0]}.pdf`);
};
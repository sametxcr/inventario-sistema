// src/config/app.js

export const FAMILIAS_DEFAULT = ['OTROS'];

// Alias para compatibilidad con código viejo
export const FAMILIAS = FAMILIAS_DEFAULT;

export const FAMILY_COLORS = {
  COBRE: '#ff6b6b',
  BRONCE: '#f4a261',
  PVC: '#45b7d1',
  PPR: '#4ecdc4',
  FIERRO: '#95a5a6',
  GASFITERIA: '#9b59b6',
  OTROS: '#e0e0e0',
  PLASTICO: '#2ecc71',
  HERRAMIENTAS: '#e74c3c',
  FITTING: '#3498db',
  VALVULAS: '#f39c12',
  TUBERIAS: '#1abc9c'
};

export const getFamilyColor = (familia) => {
  if (!familia) return '#e0e0e0';
  if (FAMILY_COLORS[familia]) return FAMILY_COLORS[familia];
  
  let hash = 0;
  for (let i = 0; i < familia.length; i++) {
    hash = familia.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export const IVA_CHILE = 1.19;

export const PORCENTAJES_VENTA = [
  { label: '20%', value: 1.2 },
  { label: '30%', value: 1.3 },
  { label: '40%', value: 1.4 },
  { label: '50%', value: 1.5 },
  { label: '60%', value: 1.6 },
  { label: '70%', value: 1.7 },
  { label: '80%', value: 1.8 },
  { label: '100%', value: 2.0 }
];

export const CHART_COLORS = [
  '#45b7d1', '#ff6b6b', '#4ecdc4', '#ffe66d', 
  '#95e1d3', '#f38181', '#aa96da'
];

export const CONFIG = {
  STOCK_MINIMO_DEFAULT: 10,
  PORCENTAJE_VENTA_DEFAULT: 1.4,
  NOMBRE_EMPRESA: 'Tu Empresa',
  RUT_EMPRESA: '76.XXX.XXX-X',
  VALIDEZ_COTIZACION_DIAS: 7
};
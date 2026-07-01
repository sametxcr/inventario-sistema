// Formatea mientras escribe: 12345678k -> 12.345.678-K
export const formatearRut = (rut) => {
  // Solo números y K
  let valor = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (valor.length === 0) return '';
  
  // Separar dígito verificador
  let cuerpo = valor.slice(0, -1);
  let dv = valor.slice(-1);
  
  // Agregar puntos al cuerpo
  cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return cuerpo ? `${cuerpo}-${dv}` : dv;
};

// Valida que el RUT sea correcto
export const validarRut = (rutCompleto) => {
  if (!rutCompleto) return false;
  
  // Limpiar: quitar puntos y guión
  const rut = rutCompleto.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  
  if (rut.length < 8) return false;
  
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplo = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  return dv === dvCalculado;
};

// Limpia el RUT: solo números y K sin formato
export const limpiarRut = (rut) => {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
};
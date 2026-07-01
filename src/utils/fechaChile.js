// src/utils/fechaChile.js

export const getFechaChile = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Santiago'
  });
};

export const getFechaHoraChileISO = () => {
  const ahora = new Date();

  const fecha = ahora.toLocaleDateString('en-CA', {
    timeZone: 'America/Santiago'
  });

  const hora = ahora.toLocaleTimeString('en-GB', {
    timeZone: 'America/Santiago',
    hour12: false
  });

  const offset = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    timeZoneName: 'longOffset'
  }).formatToParts(ahora).find(p => p.type === 'timeZoneName').value.replace('GMT', '');

  return `${fecha}T${hora}${offset}`;
};

export const formatearFechaChile = (fechaStr) => {
  if (!fechaStr) return '-';
  const fecha = parsearFechaChile(fechaStr);
  if (!fecha) return '-';

  return fecha.toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatearHoraChile = (fechaStr) => {
  if (!fechaStr) return '-';
  const fecha = parsearFechaChile(fechaStr);
  if (!fecha) return '-';

  return fecha.toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const esHoyChile = (fechaStr) => {
  if (!fechaStr) return false;
  const fecha = parsearFechaChile(fechaStr);
  if (!fecha) return false;

  const hoy = new Date(new Date().toLocaleString('en-US', {
    timeZone: 'America/Santiago'
  }));

  return fecha.toDateString() === hoy.toDateString();
};

export const parsearFechaChile = (fechaStr) => {
  if (!fechaStr) return null;
  if (fechaStr instanceof Date) return fechaStr;

  // Si viene con T o Z, es ISO UTC: "2026-06-19T03:29:00.000Z"
  // Si viene con espacio: "2026-06-19 00:00:00" de Postgres
  // new Date() maneja ambos y convierte a local, pero necesitamos forzar Chile

  let fecha;

  // Caso 1: String con hora ISO o Postgres
  if (String(fechaStr).includes('T') || String(fechaStr).includes(' ') || String(fechaStr).includes('Z')) {
    fecha = new Date(fechaStr);
  }
  // Caso 2: Solo fecha "2026-06-19" o "19-06-2026" o "19/06/2026"
  else {
    const soloFecha = String(fechaStr).split(' ')[0];
    const separador = soloFecha.includes('/')? '/' : '-';
    const partes = soloFecha.split(separador).map(Number);

    if (partes.length!== 3 || partes.some(isNaN)) return null;

    let anio, mes, dia;

    // Formato YYYY-MM-DD
    if (partes[0] > 31) {
      [anio, mes, dia] = partes;
    }
    // Formato DD-MM-YYYY
    else if (partes[2] > 31) {
      [dia, mes, anio] = partes;
    }
    // Formato DD-MM-YY
    else if (partes[2] >= 0 && partes[2] <= 99) {
      [dia, mes, anio] = partes;
      anio = anio <= 30? 2000 + anio : 1900 + anio;
    }
    else {
      [anio, mes, dia] = partes;
    }

    if (!anio ||!mes ||!dia || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

    // Si solo hay fecha, asumimos 00:00 Chile
    fecha = new Date(anio, mes - 1, dia, 0, 0, 0);
  }

  // Convierte cualquier fecha a zona horaria Chile
  return new Date(fecha.toLocaleString('en-US', {
    timeZone: 'America/Santiago'
  }));
};


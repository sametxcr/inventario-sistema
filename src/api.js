export const API_URL = import.meta.env.VITE_API_URL || 'https://taller-backend-production.up.railway.app/api';

// Función helper pa limpiar el endpoint
const buildUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_URL}/${cleanEndpoint}`;
};

export const api = {
  async get(endpoint) {
    const res = await fetch(buildUrl(endpoint)); // ← Usa buildUrl
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en GET');
    }
    return res.json();
  },

  async post(endpoint, data) {
    const res = await fetch(buildUrl(endpoint), { // ← Usa buildUrl
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en POST');
    }
    return res.json();
  },

  async put(endpoint, data) {
    const res = await fetch(buildUrl(endpoint), { // ← Usa buildUrl
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en PUT');
    }
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(buildUrl(endpoint), { // ← Usa buildUrl
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en DELETE');
    }
    return res.json();
  }
};

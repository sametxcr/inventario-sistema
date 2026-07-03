import { useState } from 'react';

export default function PasswordModal({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const CLAVE_CORRECTA = import.meta.env.VITE_APP_PASSWORD;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CLAVE_CORRECTA) {
      sessionStorage.setItem('taller_auth', 'ok');
      onSuccess();
    } else {
      setError('Clave incorrecta');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-96 border border-gray-700">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-2xl font-bold text-white">Balladares Motors</h2>
          <p className="text-gray-400 text-sm mt-2">Ingresa la clave para acceder</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Clave de acceso"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none mb-4"
            autoFocus
          />

          {error && (
            <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded transition-colors"
          >
            Entrar al Taller
          </button>
        </form>
      </div>
    </div>
  );
}


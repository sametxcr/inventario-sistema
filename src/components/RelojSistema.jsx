import { useEffect, useState } from 'react';

export default function RelojSistema() {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const offset = -hora.getTimezoneOffset() / 60;

  return (
<div className="ml-auto flex items-center gap-3 px-4 py-1.2 border-l border-gray-700">
      <div className="text-right">
        <div className="text-[9px] text-gray-500 uppercase">Sistema</div>
       <div className="text-1xl font-mono font-bold text-cyan-400 leading-none tracking-wider">
  {hora.toLocaleTimeString('es-CL')}
</div>
        <div className="text-[8px] text-gray-500">UTC{offset >= 0? '+' : ''}{offset}</div>
      </div>
    </div>
  );
}


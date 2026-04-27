import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMisPuestosOperador } from '../api';

interface Puesto { id: number; nombre: string; }

interface OperatorPuestoCtx {
  puestos: Puesto[];
  puestoId: number | null;
  puestoNombre: string;
  setPuestoId: (id: number) => void;
  loading: boolean;
}

const Ctx = createContext<OperatorPuestoCtx>({
  puestos: [], puestoId: null, puestoNombre: '', setPuestoId: () => {}, loading: true,
});

export function OperatorPuestoProvider({ children }: { children: ReactNode }) {
  const [puestos, setPuestos]   = useState<Puesto[]>([]);
  const [puestoId, _setPuestoId] = useState<number | null>(() => {
    const s = localStorage.getItem('operatorPuestoId');
    return s ? Number(s) : null;
  });
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getMisPuestosOperador()
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const list: Puesto[] = data.map(p => ({ id: Number(p.id), nombre: p.nombre }));
        setPuestos(list);
        _setPuestoId(prev => {
          const valid = prev && list.some(p => p.id === prev);
          const chosen = valid ? prev : list[0].id;
          localStorage.setItem('operatorPuestoId', String(chosen));
          return chosen;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const setPuestoId = (id: number) => {
    localStorage.setItem('operatorPuestoId', String(id));
    _setPuestoId(id);
  };

  const puestoNombre = puestos.find(p => p.id === puestoId)?.nombre ?? '';

  return (
    <Ctx.Provider value={{ puestos, puestoId, puestoNombre, setPuestoId, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOperatorPuesto() { return useContext(Ctx); }

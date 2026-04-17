import { useState, useEffect } from 'react';

// Simple navigation helper for the app
export function useNavigate() {
  return (path: string | number) => {
    if (typeof path === 'number') {
      window.history.go(path);
      setTimeout(() => {
        window.dispatchEvent(new Event('popstate'));
        window.dispatchEvent(new Event('navigation'));
      }, 50);
      return;
    }

    if ((window as any).navigateTo) {
      (window as any).navigateTo(path);
    } else {
      window.location.href = path;
    }
  };
}

export function useParams(): Record<string, string> {
  const getParams = (): Record<string, string> => {
    // Ej: "/operador/tickets/12?x=1#top" -> ["operador","tickets","12"]
    const cleanPath = window.location.pathname.split('?')[0].split('#')[0];
    const segments = cleanPath.split('/').filter(Boolean);

    // /x/:id (ej: /bar/4, /track-order/99)
    if (segments.length === 2) {
      const candidate = segments[1];
      if (/^\d+$/.test(candidate)) return { id: candidate };
    }

    // /operador/pedidos/:id  o  /operador/tickets/:id
    if (
      segments.length >= 3 &&
      segments[0] === 'operador' &&
      (segments[1] === 'pedidos' || segments[1] === 'tickets')
    ) {
      const candidate = segments[2];
      if (/^\d+$/.test(candidate)) return { id: candidate };
    }

    return {};
  };

  const [params, setParams] = useState<Record<string, string>>(getParams);

  useEffect(() => {
    const updateParams = () => setParams(getParams());

    // Al navegar con pushState custom
    window.addEventListener('navigation', updateParams);
    // Al usar atrás/adelante
    window.addEventListener('popstate', updateParams);

    return () => {
      window.removeEventListener('navigation', updateParams);
      window.removeEventListener('popstate', updateParams);
    };
  }, []);

  return params;
}

export function useLocation() {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  }));

  useEffect(() => {
    const updateLocation = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      });
    };

    window.addEventListener('popstate', updateLocation);
    window.addEventListener('navigation', updateLocation);
    return () => {
      window.removeEventListener('popstate', updateLocation);
      window.removeEventListener('navigation', updateLocation);
    };
  }, []);

  return location;
}
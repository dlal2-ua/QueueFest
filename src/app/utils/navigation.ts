import { useState, useEffect } from 'react';

// Simple navigation helper for the app
export function useNavigate() {
  return (path: string) => {
    if ((window as any).navigateTo) {
      (window as any).navigateTo(path);
    } else {
      window.location.href = path;
    }
  };
}

export function useParams(): Record<string, string> {
  const [params, setParams] = useState<Record<string, string>>(() => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Extract ID from path like /food-truck/:id or /bar/:id
    if (segments.length >= 2) {
      return { id: segments[1] };
    }
    
    return {};
  });

  useEffect(() => {
    const updateParams = () => {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length >= 2) {
        setParams({ id: segments[1] });
      } else {
        setParams({});
      }
    };

    window.addEventListener('popstate', updateParams);
    window.addEventListener('navigation', updateParams);
    return () => {
      window.removeEventListener('popstate', updateParams);
      window.removeEventListener('navigation', updateParams);
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

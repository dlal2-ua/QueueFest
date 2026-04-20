// AuthContext.tsx
// Contexto global de autenticación
// Guarda el usuario logueado y su rol en memoria
// Cualquier componente puede saber quién está logueado y qué rol tiene
// El token JWT se guarda en localStorage para persistir entre recargas

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile } from '../api';

interface User {
    id: number;
    email: string;
    nombre: string;
    rol: 'administrador' | 'gestor' | 'operador' | 'usuario';
    alias?: string;
    telefono?: string;
    fecha_nacimiento?: string;
    ciudad?: string;
    idioma_preferido?: string;
    festival_favorito?: string;
    preferencias_dieteticas?: string;
    alergias?: string;
    notificaciones_push?: boolean;
    notificaciones_email?: boolean;
    acepta_marketing?: boolean;
    avatar_url?: string;
    creado_en?: string;
    actualizado_en?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Al arrancar la app comprueba si hay sesión guardada
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setToken(token);
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            const updatedUser = await getProfile();
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error('Error al refrescar el perfil:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook para usar el contexto en cualquier componente
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
}
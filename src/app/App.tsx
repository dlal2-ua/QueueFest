// App.tsx
// Punto de entrada principal de la aplicación
// Gestiona el enrutado según el rol del usuario logueado
// - administrador → pantallas de configuración del festival
// - gestor → dashboard de supervisión
// - operador → gestión de pedidos de su barra
// - usuario → app de pedidos (lo que había antes)
// Si no hay sesión activa redirige siempre al login

import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pantallas comunes
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';

// Pantallas usuario final
import { HomeScreen } from './screens/HomeScreen';
import { FoodTruckDetailScreen } from './screens/FoodTruckDetailScreen';
import { FoodTruckOffersScreen } from './screens/FoodTruckOffersScreen';
import { BarDetailScreen } from './screens/BarDetailScreen';
import { BarOffersScreen } from './screens/BarOffersScreen';
import { OffersScreen } from './screens/OffersScreen';
import { CartScreen } from './screens/CartScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { OrderConfirmationScreen } from './screens/OrderConfirmationScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PersonalInfoScreen } from './screens/PersonalInfoScreen';
import { PaymentMethodsScreen } from './screens/PaymentMethodsScreen';
import { OrderHistoryScreen } from './screens/OrderHistoryScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { HelpSupportScreen } from './screens/HelpSupportScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { TrackOrderScreen } from './screens/TrackOrderScreen';
import { SelectionScreen } from './screens/SelectionScreen';
import { FestivalSelectScreen } from './screens/FestivalSelectScreen';

// Pantallas para operador
import { OperatorLayout } from './screens/OperadorLayout';
import { OperadorScreen } from './screens/OperadorPedidosScreen';
import { OperatorTicketsScreen } from './screens/OperatorTicketsScreen';
import { OperatorMenuScreen } from './screens/OperatorMenuScreen';
import { OperatorStockScreen } from './screens/OperatorStockScreen';


import { GestorScreen } from './screens/GestorScreen';
import { AdminScreen } from './screens/AdminScreen';

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('navigation', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('navigation', handlePopState);
    };
  }, []);

  (window as any).navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.dispatchEvent(new Event('navigation'));
  };

  if (isLoading) return <SplashScreen />;

  const path = String(currentPath || '/');

  // Rutas públicas
  if (path === '/' || path === '/splash') return <SplashScreen />;
  if (path === '/login') return <LoginScreen />;
  if (path === '/register') return <RegisterScreen />;
  if (path === '/forgot-password') return <ForgotPasswordScreen />;

  // Si no hay usuario logueado redirige al login
  if (!user) {
    (window as any).navigateTo('/login');
    return null;
  }

  // Enrutado por rol — operador con subrutas
  if (user.rol === 'operador') {
    // Redirigir la raíz del operador a /operador/pedidos
    if (path === '/' || path === '/login' || path === '/operador' || !path.startsWith('/operador')) {
      (window as any).navigateTo('/operador/pedidos');
      return null;
    }
    return (
      <OperatorLayout>
        {path === '/operador/pedidos' && <OperadorScreen />}
        {path === '/operador/tickets' && <OperatorTicketsScreen />}
        {path === '/operador/menu' && <OperatorMenuScreen />}
        {path === '/operador/stock' && <OperatorStockScreen />}
      </OperatorLayout>
    );
  }
  if (user.rol === 'gestor') return <GestorScreen />;
  if (user.rol === 'administrador') return <AdminScreen />;

  // Rutas del usuario final
  if (path === '/festival-select') return <FestivalSelectScreen />;
  if (path === '/selection') return <SelectionScreen />;
  if (path === '/home') return <HomeScreen />;
  if (path.startsWith('/food-truck/') && path.endsWith('/offers')) return <FoodTruckOffersScreen />;
  if (path.startsWith('/food-truck/')) return <FoodTruckDetailScreen />;
  if (path.startsWith('/bar/') && path.endsWith('/offers')) return <BarOffersScreen />;
  if (path.startsWith('/bar/')) return <BarDetailScreen />;
  if (path === '/offers') return <OffersScreen />;
  if (path === '/cart') return <CartScreen />;
  if (path === '/payment') return <PaymentScreen />;
  if (path === '/confirmation') return <OrderConfirmationScreen />;
  if (path === '/profile/info') return <PersonalInfoScreen />;
  if (path === '/profile/payments') return <PaymentMethodsScreen />;
  if (path === '/profile/orders') return <OrderHistoryScreen />;
  if (path === '/profile/favorites') return <FavoritesScreen />;
  if (path === '/profile/support') return <HelpSupportScreen />;
  if (path === '/profile/language') return <LanguageScreen />;
  if (path.startsWith('/track-order/')) return <TrackOrderScreen />;
  if (path.startsWith('/profile')) return <ProfileScreen />;

  return <SelectionScreen />;
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CartProvider>
          <Toaster position="bottom-center" />
          <div className="max-w-md mx-auto bg-white min-h-screen">
            <AppRoutes />
          </div>
        </CartProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
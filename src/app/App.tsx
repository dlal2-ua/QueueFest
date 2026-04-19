// App.tsx
// Punto de entrada principal de la aplicacion
// Gestiona el enrutado segun el rol del usuario logueado
// - administrador -> pantallas de configuracion del festival
// - gestor -> dashboard de supervision
// - operador -> gestion de pedidos de su barra
// - usuario -> app de pedidos
// Si no hay sesion activa redirige siempre al login
// App.tsx
// Punto de entrada principal de la aplicacion

import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PhoneFrameShell } from './components/PhoneFrameShell';

// Pantallas comunes
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';

// Pantallas para usuarios finales
import { HomeScreen } from './screens/HomeScreen';
import { FoodTruckDetailScreen } from './screens/FoodTruckDetailScreen';
import { FoodTruckOffersScreen } from './screens/FoodTruckOffersScreen';
import { BarDetailScreen } from './screens/BarDetailScreen';
import { BarOffersScreen } from './screens/BarOffersScreen';
import { OffersScreen } from './screens/OffersScreen';
import { CartScreen } from './screens/CartScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { OrderConfirmationScreen } from './screens/OrderConfirmationScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PersonalInfoScreen } from './screens/PersonalInfoScreen';
import { PaymentMethodsScreen } from './screens/PaymentMethodsScreen';
import { OrderHistoryScreen } from './screens/OrderHistoryScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { HelpSupportScreen } from './screens/HelpSupportScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { RoyaltiesScreen } from './screens/RoyaltiesScreen';
import { TrackOrderScreen } from './screens/TrackOrderScreen';
import { SelectionScreen } from './screens/SelectionScreen';
import { FestivalSelectScreen } from './screens/FestivalSelectScreen';
import { ProfileNotificationsScreen } from './screens/ProfileNotificationsScreen';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useInAppNotifications } from './hooks/useInAppNotifications';

// Pantallas operador
import { OperatorLayout } from './screens/OperadorLayout';
import { OperadorScreen } from './screens/OperadorPedidosScreen';
import { OperatorTicketsScreen } from './screens/OperatorTicketsScreen';
import { OperatorMenuScreen } from './screens/OperatorMenuScreen';
import { OperatorStockScreen } from './screens/OperatorStockScreen';
import { OperatorOrderDetailScreen } from './screens/OperatorOrderDetailScreen';

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

  const isUserRole = user?.rol === 'usuario';
  usePushNotifications(isUserRole);
  useInAppNotifications(isUserRole);

  if (isLoading) return <SplashScreen />;

  const path = String(currentPath || '/');

  // Rutas públicas — Login y Splash manejan su propio frame
  if (path === '/' || path === '/splash') return <SplashScreen />;
  if (path === '/login') return <LoginScreen />;
  if (path === '/register') return <PhoneFrameShell><RegisterScreen /></PhoneFrameShell>;
  if (path === '/forgot-password') return <PhoneFrameShell><ForgotPasswordScreen /></PhoneFrameShell>;

  if (!user) {
    (window as any).navigateTo('/login');
    return null;
  }

  // Gestor — maneja su propio frame
  if (user.rol === 'gestor') return <GestorScreen />;

  // Admin — envuelto en phone frame
  if (user.rol === 'administrador') return <PhoneFrameShell><AdminScreen /></PhoneFrameShell>;

  // Operador — OperatorLayout maneja su propio frame
  if (user.rol === 'operador') {
    if (path === '/' || path === '/login' || path === '/operador' || !path.startsWith('/operador')) {
      (window as any).navigateTo('/operador/pedidos');
      return null;
    }

    return (
      <OperatorLayout>
        {path === '/operador/pedidos' && <OperadorScreen />}
        {path.startsWith('/operador/pedidos/') && <OperatorOrderDetailScreen readOnly />}

        {path === '/operador/tickets' && <OperatorTicketsScreen />}
        {path.startsWith('/operador/tickets/') && <OperatorOrderDetailScreen readOnly={false} />}

        {path === '/operador/menu' && <OperatorMenuScreen />}
        {path === '/operador/stock' && <OperatorStockScreen />}
      </OperatorLayout>
    );
  }

  // Usuario final — envuelto en phone frame
  return (
    <PhoneFrameShell>
      {path === '/festival-select' && <FestivalSelectScreen />}
      {path === '/selection' && <SelectionScreen />}
      {path === '/home' && <HomeScreen />}
      {path.startsWith('/food-truck/') && path.endsWith('/offers') && <FoodTruckOffersScreen />}
      {path.startsWith('/food-truck/') && !path.endsWith('/offers') && <FoodTruckDetailScreen />}
      {path.startsWith('/bar/') && path.endsWith('/offers') && <BarOffersScreen />}
      {path.startsWith('/bar/') && !path.endsWith('/offers') && <BarDetailScreen />}
      {path.startsWith('/product/') && <ProductDetailScreen />}
      {path === '/offers' && <OffersScreen />}
      {path === '/cart' && <CartScreen />}
      {path === '/payment' && <PaymentScreen />}
      {path === '/confirmation' && <OrderConfirmationScreen />}
      {path === '/profile/info' && <PersonalInfoScreen />}
      {path === '/profile/royalties' && <RoyaltiesScreen />}
      {path === '/profile/payments' && <PaymentMethodsScreen />}
      {path === '/profile/orders' && <OrderHistoryScreen />}
      {path === '/profile/notifications' && <ProfileNotificationsScreen />}
      {path === '/profile/favorites' && <FavoritesScreen />}
      {path === '/profile/support' && <HelpSupportScreen />}
      {path === '/profile/language' && <LanguageScreen />}
      {path.startsWith('/track-order/') && <TrackOrderScreen />}
      {path.startsWith('/profile') && !path.includes('/profile/') && <ProfileScreen />}
      {!path.startsWith('/festival-select') && !path.startsWith('/selection') && !path.startsWith('/home')
        && !path.startsWith('/food-truck/') && !path.startsWith('/bar/') && !path.startsWith('/product/')
        && path !== '/offers' && path !== '/cart' && path !== '/payment' && path !== '/confirmation'
        && !path.startsWith('/profile') && !path.startsWith('/track-order/') && <SelectionScreen />}
    </PhoneFrameShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CartProvider>
          <Toaster position="top-center" visibleToasts={3} />
          <AppRoutes />
        </CartProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;

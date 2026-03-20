import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordConfirmationScreen } from './screens/ResetPasswordConfirmationScreen';
import { CreateNewPasswordScreen } from './screens/CreateNewPasswordScreen';
import { PasswordUpdatedScreen } from './screens/PasswordUpdatedScreen';
import { SelectionScreen } from './screens/SelectionScreen';
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

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation helper that updates both history and state
  (window as any).navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    // Dispatch a custom event so hooks can listen
    window.dispatchEvent(new Event('navigation'));
  };

  const renderRoute = () => {
    const path = String(currentPath || '/');
    
    if (path === '/') return <SplashScreen />;
    if (path === '/login') return <LoginScreen />;
    if (path === '/register') return <RegisterScreen />;
    if (path === '/forgot-password') return <ForgotPasswordScreen />;
    if (path === '/reset-password-confirmation') return <ResetPasswordConfirmationScreen />;
    if (path === '/create-new-password') return <CreateNewPasswordScreen />;
    if (path === '/password-updated') return <PasswordUpdatedScreen />;
    if (path === '/selection') return <SelectionScreen />;
    if (path === '/home') return <HomeScreen />;
    if (path.startsWith('/food-truck/') && path.endsWith('/offers')) {
      return <FoodTruckOffersScreen />;
    }
    if (path.startsWith('/food-truck/')) return <FoodTruckDetailScreen />;
    if (path.startsWith('/bar/') && path.endsWith('/offers')) {
      return <BarOffersScreen />;
    }
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
    
    // Default to home
    return <SplashScreen />;
  };

  return (
    <LanguageProvider>
      <CartProvider>
        <Toaster position="bottom-center" />
        <div className="max-w-md mx-auto bg-white min-h-screen">
          {renderRoute()}
        </div>
      </CartProvider>
    </LanguageProvider>
  );
}

export default App;

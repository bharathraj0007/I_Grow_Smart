import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Toaster } from 'sonner';
import ClientLayout from './components/layout/ClientLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthorizedRoute from './components/AuthorizedRoute';

// Client Pages
import HomePage from './pages/client/HomePage';
import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import CropRecommendationPage from './pages/client/CropRecommendationPage';
import MarketingPage from './pages/client/MarketingPage';
import SchemesPage from './pages/client/SchemesPage';
import NewslettersPage from './pages/client/NewslettersPage';
import NewsletterDetailPage from './pages/client/NewsletterDetailPage';
import SupportPage from './pages/client/SupportPage';

import PricePredictionPage from './pages/client/PricePredictionPage';
import DiseasePredictionPage from './pages/client/DiseasePredictionPage';
import PlantIdentificationPage from './pages/client/PlantIdentificationPage';
import ProfileSettingsPage from './pages/client/ProfileSettingsPage';
import CartPage from './pages/client/CartPage';
import MyOrdersPage from './pages/client/MyOrdersPage';
import ChatbotPage from './pages/client/ChatbotPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CropsManagement from './pages/admin/CropsManagement';
import ListingsManagement from './pages/admin/ListingsManagement';
import UsersManagement from './pages/admin/UsersManagement';
import SchemesManagement from './pages/admin/SchemesManagement';
import NewslettersManagement from './pages/admin/NewslettersManagement';
import TicketsManagement from './pages/admin/TicketsManagement';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
          {/* Auth Routes */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Client Routes */}
          <Route element={<ClientLayout />}>
            {/* Public Routes - No authentication required */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/schemes" element={<SchemesPage />} />
            <Route path="/newsletters" element={<NewslettersPage />} />
            <Route path="/newsletters/:id" element={<NewsletterDetailPage />} />

            {/* Protected Routes - Authentication required */}
            <Route path="/crop-recommendation" element={<AuthorizedRoute><CropRecommendationPage /></AuthorizedRoute>} />
            <Route path="/price-prediction" element={<AuthorizedRoute><PricePredictionPage /></AuthorizedRoute>} />
            <Route path="/disease-prediction" element={<AuthorizedRoute><DiseasePredictionPage /></AuthorizedRoute>} />
            <Route path="/plant-identification" element={<AuthorizedRoute><PlantIdentificationPage /></AuthorizedRoute>} />
            <Route path="/support" element={<AuthorizedRoute><SupportPage /></AuthorizedRoute>} />
            <Route path="/profile" element={<AuthorizedRoute><ProfileSettingsPage /></AuthorizedRoute>} />
            <Route path="/cart" element={<AuthorizedRoute><CartPage /></AuthorizedRoute>} />
            <Route path="/my-orders" element={<AuthorizedRoute><MyOrdersPage /></AuthorizedRoute>} />
            <Route path="/chatbot" element={<ChatbotPage />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="crops" element={<CropsManagement />} />
            <Route path="listings" element={<ListingsManagement />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="schemes" element={<SchemesManagement />} />
            <Route path="newsletters" element={<NewslettersManagement />} />
            <Route path="tickets" element={<TicketsManagement />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
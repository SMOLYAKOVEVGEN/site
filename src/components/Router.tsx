import { useEffect } from 'react';
import { MemberProvider } from '@/integrations';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from 'react-router-dom';
import { ScrollToTop } from '@/lib/scroll-to-top';
import { Toaster } from 'react-hot-toast';
import NotFoundPage from '@/components/pages/NotFoundPage';

import HomePage from '@/components/pages/HomePage';
import CatalogPage from '@/components/pages/CatalogPage';
import CategoryPage from '@/components/pages/CategoryPage';
import ProductPage from '@/components/pages/ProductPage';
import ServicesPage from '@/components/pages/ServicesPage';
import ServiceDetailPage from '@/components/pages/ServiceDetailPage';
import BrandsPage from '@/components/pages/BrandsPage';
import PartnerDetailPage from '@/components/pages/PartnerDetailPage';
import PartnersPage from '@/components/pages/PartnersPage';
import BlogPage from '@/components/pages/BlogPage';
import ArticlePage from '@/components/pages/ArticlePage';
import AboutPage from '@/components/pages/AboutPage';
import SolutionsPage from '@/components/pages/SolutionsPage';
import ContactsPage from '@/components/pages/ContactsPage';
import SearchPage from '@/components/pages/SearchPage';
import PrivacyPage from '@/components/pages/PrivacyPage';
import CookiesPage from '@/components/pages/CookiesPage';
import RequisitesPage from '@/components/pages/RequisitesPage';
import AccountPage from '@/components/pages/AccountPage';
import CustomerAccountPage from '@/components/pages/CustomerAccountPage';
import SupabaseCatalogTest from '@/components/SupabaseCatalogTest';
import FavoritesPage from '@/components/pages/FavoritesPage';
import ComparePage from '@/components/pages/ComparePage';
import CartPage from '@/components/pages/CartPage';
import CheckoutPage from '@/components/pages/CheckoutPage';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminProtectedRoute from '@/components/admin/AdminProtectedRoute';
import CheckoutProtectedRoute from '@/components/auth/CheckoutProtectedRoute';
import AdminDashboardPage from '@/components/pages/AdminDashboardPage';
import AdminProductsPage from '@/components/pages/AdminProductsPage';
import AdminProductEditPage from '@/components/pages/AdminProductEditPage';
import AdminCategoriesPage from '@/components/pages/AdminCategoriesPage';
import AdminBrandsPage from '@/components/pages/AdminBrandsPage';
import AdminImportPage from '@/components/pages/AdminImportPage';
import AdminLoginPage from '@/components/pages/AdminLoginPage';
import AdminLeadsPage from '@/components/pages/AdminLeadsPage';
import { useCatalogUI } from '@/store/catalog-ui-store';
import CheckoutAuthRequiredPage from '@/components/pages/CheckoutAuthRequiredPage';
import ForgotPasswordPage from '@/components/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/components/pages/ResetPasswordPage';
import HelpPage from '@/components/pages/HelpPage';
import PaymentPage from '@/components/pages/PaymentPage';
import DeliveryPage from '@/components/pages/DeliveryPage';
import WarrantyPage from '@/components/pages/WarrantyPage';
import CertificatesPage from '@/components/pages/CertificatesPage';


function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },

      { path: 'catalog', element: <CatalogPage /> },
      { path: 'catalog/*', element: <CategoryPage /> },

      { path: 'product/:id', element: <ProductPage /> },

      { path: 'services', element: <ServicesPage /> },
      { path: 'services/:slug', element: <ServiceDetailPage /> },

      { path: 'brands', element: <BrandsPage /> },
      { path: 'brands/:slug', element: <PartnerDetailPage /> },
      { path: 'company/brands/:slug', element: <PartnerDetailPage /> },

      { path: 'partners', element: <PartnersPage /> },

      { path: 'blog', element: <BlogPage /> },
      { path: 'blog/:slug', element: <ArticlePage /> },

      { path: 'about', element: <AboutPage /> },
      { path: 'solutions', element: <SolutionsPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'requisites', element: <RequisitesPage /> },

      { path: 'account-login', element: <AccountPage /> },
      { path: 'account', element: <CustomerAccountPage /> },

      { path: 'supabase-test', element: <SupabaseCatalogTest /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'cart', element: <CartPage /> },

      { path: 'checkout-auth-required', element: <CheckoutAuthRequiredPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },

      { path: 'help', element: <HelpPage /> },
      { path: 'payment', element: <PaymentPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'warranty', element: <WarrantyPage /> },
      { path: 'licenses-certificates', element: <CertificatesPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <CheckoutProtectedRoute />,
    children: [
      {
        path: '/checkout',
        element: <CheckoutPage />,
      },
    ],
  },
  {
    path: '/admin-login',
    element: <AdminLoginPage />,
  },
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'products', element: <AdminProductsPage /> },
          { path: 'products/:id', element: <AdminProductEditPage /> },
          { path: 'categories', element: <AdminCategoriesPage /> },
          { path: 'brands', element: <AdminBrandsPage /> },
          { path: 'import', element: <AdminImportPage /> },
          { path: 'leads', element: <AdminLeadsPage /> },
        ],
      },
    ],
  },
]);

function AppInitializer() {
  const load = useCatalogUI((s) => s.loadFromStorage);

  useEffect(() => {
    load();
  }, [load]);

  return null;
}

export default function AppRouter() {
  return (
    <MemberProvider>
      <>
        <AppInitializer />
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </>
    </MemberProvider>
  );
}
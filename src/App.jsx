import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Collections from './pages/Collections';
import CollectionPage from './pages/CollectionPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ScrollToTop from './components/ScrollToTop';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import ProjectsPage from './pages/ProjectsPage';
import BlogPage from './pages/BlogPage';
import BlogsListPage from './pages/BlogsListPage';
import ContactPage from './pages/ContactPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import RequireAuth from './components/RequireAuth';
import NotFoundPage from './pages/NotFoundPage';
import SEO from './components/SEO';

// Layout for the main website
const MainLayout = () => {
  const { pathname } = useLocation();
  return (
    <>
      <TopBar />
      <Header key={pathname} />
      <Outlet />
      <Footer />
    </>
  );
};

function App() {
  return (
    <>
      <SEO />
      <ScrollToTop />
      <div className="min-h-screen">
        <Routes>
          {/* Main Website Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/blogs" element={<BlogsListPage />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:category" element={<CollectionPage />} />
            <Route path="/collections/:category/:productName" element={<ProductDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Admin Routes (No Header/Footer) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </>
  );
}

export default App;

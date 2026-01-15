import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AdvisorGrid } from './components/AdvisorGrid';
import { Footer } from './components/Footer';
import { AdvisorModal } from './components/AdvisorModal';
import { Advisor } from './types';
import { authService } from './services/authService';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

import { Feed } from './pages/Feed';
import { AIDivination } from './pages/AIDivination';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdvisorDashboard } from './pages/AdvisorDashboard';
import { AdvisorMarket } from './pages/AdvisorMarket';
import { AdvisorProfile } from './pages/AdvisorProfile';
import { Messages } from './pages/Messages';
import { Connections } from './pages/Connections';
import ScrollToTop from './components/ScrollToTop';

const ProfileRedirect: React.FC = () => {
  const [user, setUser] = useState(authService.auth.currentUser);
  const [loading, setLoading] = useState(!user);

  React.useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={`/profile/${user.uid}`} replace />;
};

const Layout: React.FC = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  // Hide global navbar for AI Divination page too? Or keep it?
  // The AI Divination page has its own strong branding (dark mode). The white navbar might clash.
  // But navigation is needed. 
  // Let's keep Navbar for now. If it looks bad (white on dark), we might need a dark navbar variant.
  // For now, simple standard usage.

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-500/30 ${!isAuthPage ? 'pt-28 md:pt-16' : ''}`}>
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/ai-divination" element={<AIDivination />} />
        <Route path="/market" element={<AdvisorMarket />} />
        <Route path="/profile/:id" element={<AdvisorProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/advisor-dashboard" element={<AdvisorDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Layout />
    </Router>
  );
};

export default App;
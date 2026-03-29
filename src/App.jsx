import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import Chatbot from './components/Chatbot';
import AppShell from './components/layout/AppShell';
import Home from './Home';
import AuthPage from './pages/AuthPage';
import AssistantPage from './pages/AssistantPage';
import ComplaintPage from './pages/ComplaintPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import ServicesPage from './pages/ServicesPage';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const showChatbot = location.pathname !== '/login';

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/assistant"
          element={
            <AppShell>
              <AssistantPage />
            </AppShell>
          }
        />
        <Route
          path="/complaint"
          element={
            <AppShell>
              <ComplaintPage />
            </AppShell>
          }
        />
        <Route
          path="/documents"
          element={
            <AppShell>
              <DocumentsPage />
            </AppShell>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/services"
          element={
            <AppShell>
              <ServicesPage />
            </AppShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showChatbot ? <Chatbot onStartComplaint={() => navigate('/complaint')} /> : null}
    </>
  );
}

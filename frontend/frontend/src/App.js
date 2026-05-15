import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import ThankYou from "./pages/ThankYou";
import Login from "./pages/Login";
import AuthCallback from "./components/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import LeadsPage from "./pages/admin/Leads";
import LeadDetail from "./pages/admin/LeadDetail";
import OfficesPage from "./pages/admin/Offices";
import AppointmentsPage from "./pages/admin/Appointments";
import NewAppointment from "./pages/admin/NewAppointment";

function AppRouter() {
  const location = useLocation();
  // CRITICAL: Detect session_id synchronously during render to avoid race conditions
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gracias" element={<ThankYou />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="offices" element={<OfficesPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/new" element={<NewAppointment />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <AppRouter />
    </BrowserRouter>
  );
}

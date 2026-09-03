import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import CitizenDashboard from "@/pages/citizen/CitizenDashboard";
import ReportIssuePage from "@/pages/citizen/ReportIssuePage";
import MyIssuesPage from "@/pages/citizen/MyIssuesPage";
import OfficerDashboard from "@/pages/officer/OfficerDashboard";
import AssignedIssuesPage from "@/pages/officer/AssignedIssuesPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminIssuesPage from "@/pages/admin/AdminIssuesPage";
import AdminMapPage from "@/pages/admin/AdminMapPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import { ROLE_ROUTES } from "@/lib/constants";

function ProtectedRoute({ role, children }: { role: "citizen" | "officer" | "admin"; children: ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 animate-pulse">
            <img src="/city-logo.png" alt="CityResolve" className="h-12 w-12 rounded-xl object-cover" />
          </div>
          <p className="text-sm text-slate-500">Loading CityResolve...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to={`/auth/signin/${role}`} state={{ from: location }} replace />;
  }

  if (profile.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h2 className="text-xl font-bold text-amber-800">Role Mismatch</h2>
          <p className="mt-2 text-sm text-amber-700">
            You're signed in as <strong>{profile.role}</strong>, but this area is for <strong>{role}</strong>s.
          </p>
          <button
            onClick={() => (window.location.href = ROLE_ROUTES[profile.role])}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Go to your workspace
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthPageWrapper() {
  const { mode } = useParams<{ mode: string; role: string }>();
  const validMode = mode === "signin" || mode === "signup" ? mode : "signin";
  return <AuthPage mode={validMode} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/:mode/:role" element={<AuthPageWrapper />} />
      <Route path="/signin/:role" element={<AuthPage mode="signin" />} />
      <Route path="/signup/:role" element={<AuthPage mode="signup" />} />
      <Route path="/citizen" element={<ProtectedRoute role="citizen"><CitizenDashboard /></ProtectedRoute>} />
      <Route path="/citizen/report" element={<ProtectedRoute role="citizen"><ReportIssuePage /></ProtectedRoute>} />
      <Route path="/citizen/issues" element={<ProtectedRoute role="citizen"><MyIssuesPage /></ProtectedRoute>} />
      <Route path="/officer" element={<ProtectedRoute role="officer"><OfficerDashboard /></ProtectedRoute>} />
      <Route path="/officer/assigned" element={<ProtectedRoute role="officer"><AssignedIssuesPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/issues" element={<ProtectedRoute role="admin"><AdminIssuesPage /></ProtectedRoute>} />
      <Route path="/admin/map" element={<ProtectedRoute role="admin"><AdminMapPage /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

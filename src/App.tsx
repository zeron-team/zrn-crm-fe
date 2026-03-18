import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import registry from "./modules/registry";

const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

/**
 * App.tsx — Dynamic route generation from Module Registry
 * Routes are no longer hardcoded. Each module declares its routes
 * in src/modules/registry.ts and they are rendered here automatically.
 *
 * "/" is a PUBLIC landing page (no auth required).
 * All other routes require authentication via ProtectedRoute + Layout.
 */
function App() {
  const allRoutes = registry.getAllRoutes();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={
          <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-gray-400 font-medium">Cargando módulo...</p>
            </div>
          </div>
        }>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal" element={<ClientPortal />} />

            {/* ── Protected routes (require auth + Layout sidebar) ── */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Dynamic routes from Module Registry */}
              {allRoutes.map((route) => (
                <Route
                  key={route.path || "index"}
                  path={route.path || undefined}
                  element={<route.component />}
                />
              ))}
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

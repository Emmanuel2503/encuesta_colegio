import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ResultsView from "./components/admin/ResultsView";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SurveyBuilder from "./components/admin/SurveyBuilder";
import SurveyPublicView from "./pages/SurveyPublicView";
import ProtectedRoute from "./components/admin/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =======================================================
            RUTAS PÚBLICAS (Cualquiera puede entrar)
           ======================================================= */}

        {/* Redirección inicial */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login de la Directora */}
        <Route path="/login" element={<AdminLogin />} />

        {/* Vista Pública para Estudiantes (NO debe tener protección) */}
        <Route path="/encuesta/:link" element={<SurveyPublicView />} />

        {/* =======================================================
            RUTAS PROTEGIDAS (Solo con Token y Sesión Activa)
            Aquí usamos ProtectedRoute como un "Layout" o envoltorio
           ======================================================= */}
        <Route element={<ProtectedRoute />}>
          {/* 1. Panel Principal */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* 2. Ver Resultados */}
          <Route path="/admin/resultados" element={<ResultsView />} />

          {/* 3. Crear Encuesta (Con tu diseño personalizado inline) */}
          <Route
            path="/admin/crear"
            element={
              <div className="min-h-screen bg-gray-50 pb-10">
                <div className="max-w-4xl mx-auto pt-6 px-6">
                  <a
                    href="/admin/dashboard"
                    className="text-gray-500 hover:text-gray-800 text-sm"
                  >
                    ← Volver al Panel
                  </a>
                </div>
                <SurveyBuilder />
              </div>
            }
          />
        </Route>
        {/* Fin del bloque protegido */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

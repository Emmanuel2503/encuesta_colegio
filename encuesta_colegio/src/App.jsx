import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { Toaster } from "react-hot-toast"; // <--- LO DEJAMOS COMENTADO POR AHORA
import ResultsView from "./components/admin/ResultsView";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SurveyBuilder from "./components/admin/SurveyBuilder";
import SurveyPublicView from "./pages/SurveyPublicView";
import ProtectedRoute from "./components/admin/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      {/* <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
        }}
      />
      */}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/encuesta/:link" element={<SurveyPublicView />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/resultados" element={<ResultsView />} />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { Toaster } from "react-hot-toast"; // <--- LO DEJAMOS COMENTADO POR AHORA
import ResultsView from "./components/admin/ResultsView";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SurveyBuilder from "./components/admin/SurveyBuilder";
import SurveyPublicView from "./pages/SurveyPublicView";
import TeacherRanking from "./pages/TeacherRanking"; // Nuevo
import ProtectedRoute from "./components/admin/ProtectedRoute";
import EditSurvey from "./components/admin/EditSurvey";
import UserManagement from "./pages/admin/UserManagement";
import SurveyGroupView from "./pages/SurveyGroupView";
import SurveyGroupManager from "./pages/admin/SurveyGroupManager";
import SurveyGroupForm from "./pages/admin/SurveyGroupForm";

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
        <Route path="/grupo/:link" element={<SurveyGroupView />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/ranking" element={<TeacherRanking />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/grupos" element={<SurveyGroupManager />} />
          <Route path="/admin/grupos/nuevo" element={<SurveyGroupForm />} />
          <Route path="/admin/grupos/editar/:id" element={<SurveyGroupForm />} />
          <Route path="/admin/resultados" element={<ResultsView />} />
          <Route
            path="/admin/crear"
            element={
              <div className="min-h-screen bg-gray-50 pb-10">
                <div className="max-w-4xl mx-auto pt-6 px-6">
                  <a
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium transition-colors"
                  >
                    ← Volver al Panel Principal
                  </a>
                </div>
                <SurveyBuilder />
              </div>
            }
          />
          <Route
            path="/admin/editar/:id"
            element={
              <div className="min-h-screen bg-gray-50 pb-10">
                <div className="max-w-4xl mx-auto pt-6 px-6">
                  <a
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium transition-colors"
                  >
                    ← Volver al Panel Principal
                  </a>
                </div>
                <EditSurvey />
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

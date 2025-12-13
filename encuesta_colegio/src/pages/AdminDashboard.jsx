import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  BarChart3,
  LogOut,
  Trash2,
  ExternalLink,
  Copy,
  RotateCcw,
  Files,
  LayoutDashboard,
  Users,
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import api from "../api/axiosConfig";
import toast from "react-hot-toast"; // Notificaciones ligeras
import Swal from "sweetalert2"; // Modales de confirmación

const AdminDashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const totalResponses = surveys.reduce(
    (acc, curr) => acc + parseInt(curr.response_count || 0),
    0
  );
  const activeSurveys = surveys.length;

  const fetchSurveys = async () => {
    try {
      const res = await api.get("/api/admin/surveys");
      setSurveys(res.data);
    } catch (error) {
      toast.error("No se pudo cargar la información del servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // --- REEMPLAZO DE WINDOW.CONFIRM POR SWEETALERT ---
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "¿Estás segura?",
      text: "No podrás revertir esto. Se borrarán todas las respuestas asociadas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444", // Rojo
      cancelButtonColor: "#3b82f6", // Azul
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/surveys/${id}`);
        setSurveys(surveys.filter((s) => s.id !== id));
        // Mensaje de éxito bonito
        Swal.fire(
          "¡Eliminado!",
          "La encuesta ha sido borrada del sistema.",
          "success"
        );
      } catch (error) {
        toast.error("Error al eliminar la encuesta.");
      }
    }
  };

  const handleReset = async (id, title) => {
    const result = await Swal.fire({
      title: "¿Reiniciar contadores?",
      text: `Estás a punto de borrar TODAS las respuestas de "${title}".`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316", // Naranja
      cancelButtonColor: "#64748b", // Gris
      confirmButtonText: "Sí, reiniciar a cero",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/surveys/${id}/reset`);
        fetchSurveys(); // Recargamos para ver el 0
        toast.success("Contadores reiniciados.");
      } catch (error) {
        toast.error("No se pudo reiniciar.");
      }
    }
  };

  const copyLink = (link) => {
    const fullLink = `${window.location.origin}/encuesta/${link}`;
    navigator.clipboard.writeText(fullLink);
    toast.success("Enlace copiado al portapapeles", {
      icon: "🔗",
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
      },
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("last_activity");
    navigate("/login");
    toast("Sesión cerrada", { icon: "👋" });
  };

  const handleDuplicate = async (id) => {
    const loadingToast = toast.loading("Preparando plantilla...");
    try {
      const res = await api.get(`/api/admin/surveys/${id}/results`);
      toast.dismiss(loadingToast);
      navigate("/admin/crear", { state: { cloneData: res.data } });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al duplicar plantilla.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">
              Panel Académico
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700">Directora</p>
              <p className="text-xs text-slate-400">Sesión Activa</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* HEADER & METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Resumen General
            </h2>
            <p className="text-slate-500">
              Gestiona y supervisa las evaluaciones institucionales.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Encuestas Activas
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {activeSurveys}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Respuestas Totales
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {totalResponses}
              </p>
            </div>
          </div>
        </div>

        {/* ACTIONS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <Link
            to="/admin/crear"
            className="flex items-center gap-5 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg shadow-blue-200 text-white hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Crear Nueva Encuesta</h3>
              <p className="text-blue-100 text-sm opacity-90">
                Diseñar formulario de evaluación
              </p>
            </div>
          </Link>

          <Link
            to="/admin/resultados"
            className="flex items-center gap-5 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="bg-purple-50 text-purple-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Ver Reportes</h3>
              <p className="text-slate-500 text-sm">
                Analizar gráficos y resultados
              </p>
            </div>
          </Link>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Files size={20} className="text-slate-400" />
              Historial Reciente
            </h3>
          </div>

          {surveys.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-block p-4 bg-slate-50 rounded-full mb-4">
                <FileText size={40} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">
                No hay encuestas creadas todavía.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Crea una nueva para comenzar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Título / Materia</th>
                    <th className="px-6 py-4">Audiencia</th>
                    <th className="px-6 py-4 text-center">Participación</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {surveys.map((survey) => (
                    <tr
                      key={survey.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-base">
                          {survey.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Users size={12} /> {survey.subject || "General"}
                          {survey.evaluated_name &&
                            ` • ${survey.evaluated_name}`}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            survey.target_audience === "ESTUDIANTE_A_DOCENTE"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-purple-50 text-purple-700 border-purple-100"
                          }`}
                        >
                          {survey.target_audience === "ESTUDIANTE_A_DOCENTE"
                            ? "Estudiante"
                            : "Docente"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-2 font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                          <span
                            className={
                              parseInt(survey.response_count) > 0
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }
                          >
                            {survey.response_count}
                          </span>
                          <span className="text-xs font-normal text-slate-400">
                            envíos
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(survey.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyLink(survey.access_link)}
                            className="p-2 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100"
                            title="Copiar Enlace"
                          >
                            <Copy size={18} />
                          </button>

                          <button
                            onClick={() => handleDuplicate(survey.id)}
                            className="p-2 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100"
                            title="Duplicar Plantilla"
                          >
                            <Files size={18} />
                          </button>

                          <a
                            href={`/encuesta/${survey.access_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white hover:text-emerald-600 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100"
                            title="Ver Vista Previa"
                          >
                            <ExternalLink size={18} />
                          </a>

                          {parseInt(survey.response_count) > 0 && (
                            <button
                              onClick={() =>
                                handleReset(survey.id, survey.title)
                              }
                              className="p-2 hover:bg-white hover:text-orange-500 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100"
                              title="Reiniciar Respuestas"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}

                          <div className="w-px h-6 bg-slate-200 mx-1"></div>

                          <button
                            onClick={() => handleDelete(survey.id)}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                            title="Eliminar Encuesta"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PlusCircle,
  BarChart3,
  LogOut,
  Trash2,
  ExternalLink,
  Copy,
  RotateCcw,
  Files,
} from "lucide-react";
import axios from "axios";

const AdminDashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. CARGAR DATOS REALES
  const fetchSurveys = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/admin/surveys");
      setSurveys(res.data);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // 2. FUNCIÓN ELIMINAR
  const handleDelete = async (id) => {
    if (
      window.confirm(
        "¿Estás segura de eliminar esta encuesta? Se borrarán todos los resultados asociados."
      )
    ) {
      try {
        await axios.delete(`http://localhost:3000/api/surveys/${id}`);
        // Actualizamos la lista visualmente sin recargar
        setSurveys(surveys.filter((s) => s.id !== id));
        alert("Encuesta eliminada.");
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  // 3. COPIAR LINK
  const copyLink = (link) => {
    const fullLink = `${window.location.origin}/encuesta/${link}`;
    navigator.clipboard.writeText(fullLink);
    alert("Link copiado al portapapeles: " + fullLink);
  };

  // 4. CERRAR SESIÓN MANUAL
  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("last_activity");
    navigate("/login");
  };

  // Función para reiniciar resultados a 0
  const handleReset = async (id, title) => {
    const confirmMessage = `¿Estás segura de borrar TODAS las respuestas de la encuesta "${title}"?\n\nÚsalo después de probar la encuesta para dejarla en 0 para los estudiantes.\n\nEsta acción no se puede deshacer.`;

    if (window.confirm(confirmMessage)) {
      try {
        await axios.delete(`http://localhost:3000/api/surveys/${id}/reset`);
        alert("Métricas reiniciadas exitosamente.");
        // Recargar la lista para ver el contador en 0
        fetchSurveys();
      } catch (error) {
        alert("Error al reiniciar.");
      }
    }
  };

  // Función para Duplicar
  const handleDuplicate = async (id) => {
    try {
      // 1. Buscamos los detalles completos de esa encuesta (incluyendo preguntas)
      const res = await axios.get(
        `http://localhost:3000/api/admin/surveys/${id}/results`
      );
      const surveyData = res.data;

      // 2. Navegamos al Creador, pero le pasamos los datos en el "estado" de la navegación
      navigate("/admin/crear", { state: { cloneData: surveyData } });
    } catch (error) {
      alert("Error al cargar datos para duplicar.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Panel de Control</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <LogOut size={18} /> Salir
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Bienvenida, Directora
          </h2>
          <p className="text-gray-500 mt-2">
            Gestiona las encuestas académicas.
          </p>
        </div>

        {/* Accesos Directos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link
            to="/admin/crear"
            className="group bg-blue-600 p-6 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-4 text-white"
          >
            <div className="p-3 bg-white/20 rounded-lg">
              <PlusCircle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Nueva Encuesta</h3>
              <p className="text-blue-100 text-sm">
                Crear formulario de evaluación
              </p>
            </div>
          </Link>

          <Link
            to="/admin/resultados"
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-300 transition-all flex items-center gap-4"
          >
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <BarChart3 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Ver Analíticas
              </h3>
              <p className="text-gray-500 text-sm">
                Explorar gráficos detallados
              </p>
            </div>
          </Link>
        </div>

        {/* TABLA DE ENCUESTAS ACTIVAS */}
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Historial de Encuestas
        </h3>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Cargando datos...
            </div>
          ) : surveys.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay encuestas creadas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase border-b">
                  <tr>
                    <th className="p-4 font-medium">Título</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Respuestas</th>
                    <th className="p-4 font-medium">Creación</th>
                    <th className="p-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {surveys.map((survey) => (
                    <tr
                      key={survey.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-bold text-gray-900">
                          {survey.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {survey.subject || "General"}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            survey.target_audience === "ESTUDIANTE_A_DOCENTE"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {survey.target_audience === "ESTUDIANTE_A_DOCENTE"
                            ? "Estudiante"
                            : "Docente"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">
                        {survey.response_count} envíos
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-3">
                        {/* Botón Copiar Link */}
                        <button
                          onClick={() => copyLink(survey.access_link)}
                          className="text-gray-400 hover:text-blue-600 tooltip"
                          title="Copiar Link"
                        >
                          <Copy size={18} />
                        </button>

                        {/* Botón Duplicar */}
                        <button
                          onClick={() => handleDuplicate(survey.id)}
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                          title="Duplicar Encuesta (Usar como plantilla)"
                        >
                          <Files size={18} />
                        </button>

                        {/* Botón Ver Encuesta (Abrir en nueva pestaña) */}
                        <a
                          href={`/encuesta/${survey.access_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-green-600"
                          title="Probar Encuesta"
                        >
                          <ExternalLink size={18} />
                        </a>

                        {/* Botón Reiniciar (Solo mostrar si hay respuestas > 0) */}
                        {parseInt(survey.response_count) > 0 && (
                          <button
                            onClick={() => handleReset(survey.id, survey.title)}
                            className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 p-1 rounded transition-colors"
                            title="Reiniciar contadores a cero (Borrar respuestas)"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

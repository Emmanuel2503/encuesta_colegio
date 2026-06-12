import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GripVertical, Loader2 } from "lucide-react";
import api from "../../api/axiosConfig";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { localToUTC, utcToLocal } from "../../utils/dateUtils";

const YEAR_OPTIONS = [
  "1er año",
  "2do año",
  "3er año",
  "4to año",
  "5to año",
];

const SurveyGroupForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [availableSurveys, setAvailableSurveys] = useState([]);

  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState(YEAR_OPTIONS[0]);
  const [expirationDate, setExpirationDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user_data");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser(parsed);

    const load = async () => {
      try {
        const surveysRes = await api.get("/api/admin/surveys");
        setAvailableSurveys(surveysRes.data);

        if (isEdit) {
          const groupRes = await api.get(`/api/survey-groups/${id}`);
          const group = groupRes.data;
          setName(group.name);
          setYearLevel(group.year_level);
          setExpirationDate(utcToLocal(group.expiration_date));
          setIsActive(group.is_active !== false);
          const ordered = [...group.surveys]
            .sort((a, b) => a.order_index - b.order_index)
            .map((s) => s.id);
          setSelectedIds(ordered);
        }
      } catch {
        toast.error("Error al cargar datos del formulario.");
        navigate("/admin/grupos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit, navigate]);

  const toggleSurvey = (surveyId) => {
    setSelectedIds((prev) =>
      prev.includes(surveyId)
        ? prev.filter((sid) => sid !== surveyId)
        : [...prev, surveyId],
    );
  };

  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const getSurveyById = (surveyId) =>
    availableSurveys.find((s) => s.id === surveyId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("El nombre del grupo es obligatorio.");
      return;
    }
    if (!expirationDate) {
      toast.error("La fecha de cierre es obligatoria.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos una encuesta.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        year_level: yearLevel,
        expiration_date: localToUTC(expirationDate),
        survey_ids: selectedIds,
        userId: user.id,
        userRole: user.role,
      };

      if (isEdit) {
        payload.is_active = isActive;
        await api.put(`/api/survey-groups/${id}`, payload);
        await Swal.fire({
          title: "¡Grupo actualizado!",
          text: "Los cambios se guardaron correctamente.",
          icon: "success",
          confirmButtonColor: "#2563eb",
        });
      } else {
        const res = await api.post("/api/survey-groups", payload);
        const link = `${window.location.origin}/grupo/${res.data.access_link}`;
        navigator.clipboard.writeText(link);
        await Swal.fire({
          title: "¡Grupo creado!",
          html: `
            <p class="text-gray-600 mb-4">El grupo se guardó correctamente.</p>
            <div class="bg-gray-100 p-3 rounded border text-sm text-blue-600 font-mono break-all">${link}</div>
            <p class="text-xs text-gray-400 mt-2">Enlace copiado al portapapeles ✨</p>
          `,
          icon: "success",
          confirmButtonColor: "#2563eb",
        });
      }
      navigate("/admin/grupos");
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.error || "No se pudo guardar el grupo",
        "error",
      );
      setSaving(false);
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <div className="max-w-3xl mx-auto pt-8 px-6">
        <Link
          to="/admin/grupos"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> Volver a Grupos
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEdit ? "Editar Grupo" : "Nuevo Grupo de Encuestas"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nombre del grupo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Evaluación 1er Año - Lapso I 2025"'
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Año escolar <span className="text-red-500">*</span>
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white"
                required
              >
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Fecha de cierre <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Grupo activo
                </p>
                <p className="text-xs text-slate-400">
                  Desactiva para ocultar el enlace público del grupo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isActive ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Encuestas disponibles <span className="text-red-500">*</span>
            </label>
            <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
              {availableSurveys.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 text-center">
                  No hay encuestas disponibles. Crea encuestas primero.
                </p>
              ) : (
                availableSurveys.map((survey) => (
                  <label
                    key={survey.id}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(survey.id)}
                      onChange={() => toggleSurvey(survey.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {survey.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {survey.evaluated_name}
                        {survey.subject ? ` · ${survey.subject}` : ""}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Orden de evaluación (arrastra para reordenar)
              </label>
              <div className="space-y-2">
                {selectedIds.map((surveyId, index) => {
                  const survey = getSurveyById(surveyId);
                  if (!survey) return null;
                  return (
                    <div
                      key={surveyId}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing ${
                        dragIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <GripVertical size={18} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-blue-500 w-5">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {survey.evaluated_name || survey.title}
                        </p>
                        {survey.subject && (
                          <p className="text-xs text-slate-500">{survey.subject}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Guardar Cambios"
                  : "Crear Grupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyGroupForm;

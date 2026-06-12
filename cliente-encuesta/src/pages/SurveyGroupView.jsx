import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  BookOpen,
  User,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import api from "../api/axiosConfig";

const SurveyGroupView = () => {
  const { link } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await api.get(`/api/public/groups/${link}`);
        const { group, surveys } = res.data;
        setGroupData({ group, surveys });

        const saved = localStorage.getItem(`group_progress_${group.id}`);
        if (saved) {
          setCompletedIds(JSON.parse(saved));
        }
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar el grupo");
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [link]);

  useEffect(() => {
    if (groupData && location.state?.justCompleted) {
      const saved = localStorage.getItem(
        `group_progress_${groupData.group.id}`,
      );
      if (saved) setCompletedIds(JSON.parse(saved));
      window.history.replaceState({}, "");
    }
  }, [location.state, groupData]);

  const handleEvaluar = (survey) => {
    navigate(`/encuesta/${survey.access_link}`, {
      state: {
        groupLink: link,
        groupId: groupData.group.id,
        surveyId: survey.id,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">
          Evaluación no disponible
        </h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const { group, surveys } = groupData;
  const allCompleted = surveys.every((s) => completedIds.includes(s.id));

  if (allCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          ¡Evaluación Completada!
        </h2>
        <p className="text-gray-500 max-w-md">
          Has evaluado a todos los profesores de{" "}
          <strong>{group.year_level}</strong>. Gracias por participar.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            {group.year_level}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {group.expiration_date && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Clock size={12} />
              Cierra: {new Date(group.expiration_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-800">
              {completedIds.length}
            </span>{" "}
            de <span className="font-bold">{surveys.length}</span> evaluaciones
            completadas
          </p>
          <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${(completedIds.length / surveys.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {surveys.map((survey) => {
            const done = completedIds.includes(survey.id);
            const isExpiredOrInactive =
              survey.is_active === false ||
              (survey.expiration_date &&
                new Date(survey.expiration_date) < new Date());

            return (
              <div
                key={survey.id}
                className={`bg-white rounded-2xl border p-5 flex items-center gap-4 transition-all ${
                  done
                    ? "border-green-200 bg-green-50/50"
                    : "border-gray-200 hover:border-blue-200 hover:shadow-sm"
                }`}
              >
                <div
                  className={`p-2 rounded-full flex-shrink-0 ${
                    done
                      ? "bg-green-100 text-green-600"
                      : "bg-blue-50 text-blue-500"
                  }`}
                >
                  {done ? <CheckCircle size={24} /> : <User size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">
                    {survey.evaluated_name}
                  </p>
                  {survey.subject && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <BookOpen size={11} /> {survey.subject}
                    </p>
                  )}
                  {done && (
                    <p className="text-xs text-green-600 font-bold mt-1">
                      ✓ Evaluado
                    </p>
                  )}
                </div>

                {!done && (
                  <button
                    onClick={() => handleEvaluar(survey)}
                    disabled={isExpiredOrInactive}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
                  >
                    Evaluar <ChevronRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Tu progreso se guarda automáticamente. Puedes cerrar esta página y
          continuar después.
        </p>
      </div>
    </div>
  );
};

export default SurveyGroupView;

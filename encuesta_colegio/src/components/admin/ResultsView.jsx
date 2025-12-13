import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig"; // <--- CAMBIO IMPORTANTE

const ResultsView = () => {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Cargar la lista de encuestas
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const res = await api.get("/api/admin/surveys");
        setSurveys(res.data);
      } catch (error) {
        console.error("Error cargando encuestas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, []);

  // 2. Cargar detalles
  const handleSelectSurvey = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/surveys/${id}/results`);
      setSelectedSurvey(res.data);
    } catch (error) {
      alert("Error cargando los detalles.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-blue-600">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // --- VISTA 1: LISTADO ---
  if (!selectedSurvey) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> Volver al Panel Principal
        </Link>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Resultados Reales
          </h2>
          <p className="text-gray-500">
            Selecciona una encuesta para ver sus métricas.
          </p>
        </div>

        {surveys.length === 0 ? (
          <div className="p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">No hay encuestas creadas todavía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                onClick={() => handleSelectSurvey(survey.id)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                    {survey.target_audience === "ESTUDIANTE_A_DOCENTE"
                      ? "Estudiante"
                      : "Docente"}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(survey.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 truncate">
                  {survey.title}
                </h3>
                {survey.evaluated_name && (
                  <p className="text-sm text-gray-500 mb-3">
                    Prof: {survey.evaluated_name}
                  </p>
                )}

                <div className="flex items-center gap-2 text-gray-500 text-sm mt-auto pt-3 border-t">
                  <Users size={16} />
                  <span className="font-semibold">
                    {survey.response_count || 0}
                  </span>{" "}
                  respuestas
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- VISTA 2: DETALLE ---
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <button
          onClick={() => setSelectedSurvey(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={20} /> Volver a la lista
        </button>

        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedSurvey.title}
            </h1>
            <p className="text-gray-500 mt-1">
              Evaluado: <b>{selectedSurvey.evaluated_name || "N/A"}</b> |
              Materia: <b>{selectedSurvey.subject || "N/A"}</b>
            </p>
          </div>
          <div className="bg-white px-6 py-3 rounded-lg shadow-sm border text-center">
            <span className="block text-3xl font-bold text-blue-600">
              {selectedSurvey.questions_analysis[0]?.data.reduce(
                (acc, curr) => acc + curr.value,
                0
              ) || 0}
            </span>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Muestras
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {selectedSurvey.questions_analysis.map((question, index) => (
          <div
            key={question.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="mb-6">
              <span className="text-xs font-bold text-blue-500 uppercase">
                Pregunta {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-gray-800 mt-1">
                {question.question_text}
              </h3>
            </div>

            {question.data && question.data.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={question.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f3f4f6" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {question.data.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={i >= 3 ? "#3b82f6" : "#9ca3af"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center bg-gray-50 rounded text-gray-400 text-sm">
                Análisis de texto no disponible en gráfico
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsView;

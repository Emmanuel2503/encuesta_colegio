import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Award,
  Users,
  TrendingUp,
  Eye,
  Search,
  HelpCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";

const TeacherRanking = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (selectedTeacher) {
      const fetchDetails = async () => {
        setDetailsLoading(true);
        try {
          // NOTE: teacherId is now a string name, so we encode it
          const res = await api.get(
            `/api/reports/teachers-ranking/${encodeURIComponent(selectedTeacher.teacher_id)}/details`,
          );
          setTeacherDetails(res.data);
        } catch (error) {
          console.error("Error cargando detalles:", error);
        } finally {
          setDetailsLoading(false);
        }
      };
      fetchDetails();
    } else {
      setTeacherDetails([]);
    }
  }, [selectedTeacher]);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await api.get("/api/reports/teachers-ranking");
        // Asegurar que los números sean números para cálculos
        const formatted = res.data.map((t) => ({
          ...t,
          average_score: Number(t.average_score),
          total_surveys: Number(t.total_surveys),
        }));
        setTeachers(formatted);
      } catch (error) {
        console.error("Error cargando ranking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  // --- CÁLCULOS KPI ---
  const totalSurveys = teachers.reduce((acc, t) => acc + t.total_surveys, 0);
  const schoolAverage =
    teachers.length > 0
      ? (
          teachers.reduce((acc, t) => acc + t.average_score, 0) /
          teachers.length
        ).toFixed(2)
      : 0;
  const topTeacher = teachers.length > 0 ? teachers[0] : null;

  // --- LÓGICA DE COLOR DE BARRA ---
  const getBarColor = (score) => {
    if (score >= 4.0) return "bg-green-500";
    if (score >= 3.0) return "bg-yellow-400";
    return "bg-red-500";
  };

  const getScoreColor = (score) => {
    if (score >= 4.0) return "text-green-600";
    if (score >= 3.0) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-blue-600">
        Cargando Ranking...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* HEADER & NAV */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Volver al Panel Principal
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">
              Rendimiento Docente
            </h1>
            <p className="text-slate-500">Comparativa oficial de desempeño</p>
          </div>
        </div>

        {/* --- KPIs SUPERIORES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* KPI 1: Promedio Colegio */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                Promedio General
              </p>
              <h3 className="text-3xl font-bold text-slate-800">
                {schoolAverage}
                <span className="text-sm text-slate-400 font-normal ml-1">
                  / 5.0
                </span>
              </h3>
              <div className="flex items-center gap-1 mt-1 group relative cursor-help w-fit">
                <p className="text-xs text-slate-400 border-b border-dashed border-slate-300">
                  Ver escala de evaluación
                </p>
                <HelpCircle size={12} className="text-slate-400" />

                {/* TOOLTIP */}
                <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-3 z-50 text-xs">
                  <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">
                    Rangos de Desempeño
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-slate-600">
                        4.0 - 5.0 (Excelente)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <span className="text-slate-600">
                        3.0 - 3.9 (Regular)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-slate-600">
                        1.0 - 2.9 (Crítico)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI 2: Total Encuestas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                Total Opiniones
              </p>
              <h3 className="text-3xl font-bold text-slate-800">
                {totalSurveys}
              </h3>
            </div>
          </div>

          {/* KPI 3: Mejor Docente */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg z-10">
              <Award size={24} />
            </div>
            <div className="z-10">
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                Mejor Desempeño
              </p>
              <h3
                className="text-xl font-bold text-slate-800 truncate max-w-[200px]"
                title={topTeacher?.full_name}
              >
                {topTeacher ? topTeacher.full_name : "N/A"}
              </h3>
              <p className="text-xs text-green-600 font-bold">
                {topTeacher?.average_score} Puntos
              </p>
            </div>
            {/* Adorno visual */}
            <div className="absolute -right-4 -bottom-4 text-yellow-50 opacity-50">
              <Award size={100} />
            </div>
          </div>
        </div>

        {/* --- TABLA LEADERBOARD --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-700">
              Tabla de Posiciones
            </h2>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="Buscar docente..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-300 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Docente</th>
                <th className="px-6 py-4 w-1/3">Puntaje Promedio</th>
                <th className="px-6 py-4 text-center">Muestra</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, index) => (
                <tr
                  key={teacher.teacher_id}
                  className="hover:bg-blue-50/50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <td className="px-6 py-4 font-bold text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                        {teacher.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">
                          {teacher.full_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Profesor Titular
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold text-lg w-8 ${getScoreColor(teacher.average_score)}`}
                      >
                        {teacher.average_score}
                      </span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(
                            teacher.average_score,
                          )}`}
                          style={{
                            width: `${(teacher.average_score / 5) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full font-bold">
                      {teacher.total_surveys}
                    </span>
                    <span className="text-xs text-slate-300 block mt-1">
                      opiniones
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedTeacher(teacher)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                      title="Ver Detalles"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {teachers.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No hay datos suficientes para generar el ranking aún.
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DETALLE --- */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-3">
                {selectedTeacher.full_name.charAt(0)}
              </div>
              <h3 className="text-2xl font-bold">
                {selectedTeacher.full_name}
              </h3>
              <p className="opacity-80">Reporte Detallado</p>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-gray-800 mb-2">
                  {selectedTeacher.average_score}
                  <span className="text-2xl text-gray-400 font-normal">/5</span>
                </div>
                <p className="text-gray-500 text-sm">
                  Promedio global basado en {selectedTeacher.total_surveys}{" "}
                  encuestas.
                </p>
              </div>

              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Desempeño por Materia
              </h4>

              {detailsLoading ? (
                <div className="text-center py-6 text-slate-400">
                  Cargando desglose...
                </div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {teacherDetails.length > 0 ? (
                    teacherDetails.map((detail, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3 rounded-lg border border-slate-100"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-700 text-sm">
                            {detail.subject_name}
                          </span>
                          <span
                            className={`font-bold text-sm ${getScoreColor(detail.subject_average)}`}
                          >
                            {detail.subject_average}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getBarColor(detail.subject_average)}`}
                            style={{
                              width: `${(detail.subject_average / 5) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">
                          {detail.survey_count} opiniones
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 text-sm">
                      No hay desglose disponible.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => setSelectedTeacher(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors mt-6"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherRanking;

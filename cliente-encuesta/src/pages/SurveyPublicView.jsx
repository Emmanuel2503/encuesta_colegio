import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../api/axiosConfig";
import {
  CheckCircle,
  User,
  BookOpen,
  Clock,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";

const SurveyPublicView = () => {
  const { link } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const groupState = location.state;
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const sessionTokenRef = useRef(sessionToken);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Actualizar la ref cuando cambie sessionToken
  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  useEffect(() => {
    let isMounted = true;

    const fetchSurvey = async () => {
      try {
        const res = await api.get(`/api/public/surveys/${link}`);
        if (isMounted) {
          const fetchedSurvey = res.data;
          const expirationDate = new Date(fetchedSurvey.expiration_date);
          const currentDate = new Date();

          // Ignorar segundos para evitar problemas de timing y la hora del computador
          currentDate.setSeconds(0, 0);
          expirationDate.setSeconds(0, 0);

          if (
            currentDate > expirationDate ||
            fetchedSurvey.is_active === false
          ) {
            setError(true);
            return;
          }

          setSurvey(fetchedSurvey);
          startSession();
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const startSession = async () => {
      try {
        const res = await api.post(`/api/public/surveys/${link}/start`);
        if (isMounted) setSessionToken(res.data.sessionToken);
      } catch (err) {
        console.error("No se pudo iniciar sesión de respuesta");
      }
    };

    fetchSurvey();

    // Cleanup: finalizar sesión si el componente se desmonta
    return () => {
      isMounted = false;
      if (sessionTokenRef.current) {
        /*const data = JSON.stringify({ sessionToken: sessionTokenRef.current });
        navigator.sendBeacon(`/api/public/surveys/${link}/end`, data);*/
        fetch(`/api/public/surveys/${link}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: sessionTokenRef.current }),
          keepalive: true,
        }).catch((err) => console.error("Error al finalizar sesión:", err));
      }
    };
  }, [link]);

  // Agrupar preguntas por categoría
  const groupedQuestions = survey
    ? survey.questions.reduce((acc, q) => {
        const cat = q.category || "Cuestionario";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(q);
        return acc;
      }, {})
    : {};

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const { general_comment, ...qData } = data;
    const formattedAnswers = survey.questions.map((q) => ({
      question_id: q.id,
      value: q.question_type.includes("ESCALA")
        ? qData[`question_${q.id}`]
        : null,
      text: !q.question_type.includes("ESCALA")
        ? qData[`question_${q.id}`]
        : null,
    }));

    try {
      await api.post("/api/public/submit", {
        survey_id: survey.id,
        answers: formattedAnswers,
        general_comment,
        sessionToken, // Incluir el token
      });
      setSubmitted(true);
      setSessionToken(null);

      if (groupState?.groupId && groupState?.surveyId) {
        const storageKey = `group_progress_${groupState.groupId}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (!existing.includes(groupState.surveyId)) {
          existing.push(groupState.surveyId);
          localStorage.setItem(storageKey, JSON.stringify(existing));
        }
        setTimeout(() => {
          navigate(`/grupo/${groupState.groupLink}`, {
            state: { justCompleted: true },
          });
        }, 2000);
      }
    } catch (e) {
      alert("Error de conexión");
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 gap-2">
        <AlertCircle /> Encuesta no disponible
      </div>
    );
  if (submitted)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md">
          <CheckCircle size={60} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">¡Gracias!</h2>
          <p className="text-gray-500 mt-2">
            Tu evaluación ha sido registrada exitosamente.
          </p>
          {groupState?.groupLink && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
              <Loader2 size={16} className="animate-spin" />
              Regresando a la lista de profesores...
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* CABECERA AZUL */}
        <div className="bg-blue-600 p-8 text-white">
          <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
          <p className="opacity-90 text-sm mb-6">
            {survey.description || "Por favor responde con objetividad."}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wide opacity-80">
            {survey.evaluated_name && (
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded">
                <User size={14} /> Nombre: {survey.evaluated_name}
              </span>
            )}
            {survey.subject && (
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded">
                <BookOpen size={14} /> Materia: {survey.subject}
              </span>
            )}
            <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded">
              <Clock size={14} /> Fecha:{" "}
              {new Date(survey.expiration_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          {/* 1. LEYENDA TIPO ESTRELLAS para Estudiantes*/}
          {survey.target_audience === "ESTUDIANTE_A_DOCENTE" && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 text-sm text-gray-700">
              <h4 className="font-bold text-blue-800 mb-2">
                Guía de Puntuación (Escala 1 al 5)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-white text-blue-600 border border-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Totalmente en Desacuerdo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-white text-blue-600 border border-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>En Desacuerdo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-white text-blue-600 border border-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Neutral</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-white text-blue-600 border border-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    4
                  </span>
                  <span>De Acuerdo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-white text-blue-600 border border-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    5
                  </span>
                  <span>Totalmente de Acuerdo</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Leyenda para Docentes (SET, SEP, NSE)*/}
          {survey.target_audience === "DOCENTE_A_DOCENTE" && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 text-sm text-gray-700">
              <h4 className="font-bold text-blue-800 mb-3 text-center md:text-left">
                Guía de Puntuación
              </h4>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 flex flex-col items-center justify-center py-2 px-2 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-bold shadow-sm">
                  <span>SET - Totalmente</span>
                  <span className="text-green-600 font-medium mt-1">
                    Valor: 1 punto
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-2 px-2 rounded border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-bold shadow-sm">
                  <span>SEP - Parcialmente</span>
                  <span className="text-yellow-600 font-medium mt-1">
                    Valor: 0.5 puntos
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-2 px-2 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-bold shadow-sm">
                  <span>NSE - No se evidencia</span>
                  <span className="text-red-600 font-medium mt-1">
                    Valor: 0 puntos
                  </span>
                </div>
              </div>
            </div>
          )}

          {Object.entries(groupedQuestions).map(([category, questions]) => (
            <div key={category}>
              <h3 className="text-blue-600 font-bold text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">
                {category}
              </h3>

              <div className="space-y-6">
                {questions.map((q) => (
                  <div key={q.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-gray-800 font-medium text-sm md:text-base">
                        <span className="font-bold mr-1">
                          {survey.questions.indexOf(q) + 1}.
                        </span>{" "}
                        {q.question_text}{" "}
                        <span className="text-red-400">*</span>
                      </p>
                      {q.help_text && (
                        <div className="group relative">
                          <Info
                            size={16}
                            className="text-blue-400 cursor-help"
                          />
                          <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-10 pointer-events-none">
                            {q.help_text}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OPCIONES TIPO DOCENTE */}
                    {q.question_type === "ESCALA_DOCENTE" && (
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            l: q.scale_labels?.["1"] || "SET - Totalmente",
                            v: 1,
                            c: "peer-checked:bg-green-600 peer-checked:border-green-600",
                          },
                          {
                            l: q.scale_labels?.["0.5"] || "SEP - Parcialmente",
                            v: 0.5,
                            c: "peer-checked:bg-yellow-500 peer-checked:border-yellow-500",
                          },
                          {
                            l: q.scale_labels?.["0"] || "NSE - No se evidencia",
                            v: 0,
                            c: "peer-checked:bg-red-500 peer-checked:border-red-500",
                          },
                        ].map((opt) => (
                          <label
                            key={opt.v}
                            className="cursor-pointer flex-1 min-w-[100px]"
                          >
                            <input
                              type="radio"
                              value={opt.v}
                              {...register(`question_${q.id}`, {
                                required: true,
                              })}
                              className="peer sr-only"
                            />
                            <div
                              className={`text-center py-2 px-1 rounded border border-gray-200 text-xs font-bold text-gray-500 transition-all hover:bg-gray-50 peer-checked:text-white ${opt.c}`}
                            >
                              {opt.l}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* OPCIONES TIPO ESTRELLAS */}
                    {q.question_type === "ESCALA_1_5" && (
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <label key={v} className="cursor-pointer flex flex-col items-center gap-1">
                            <input
                              type="radio"
                              value={v}
                              {...register(`question_${q.id}`, {
                                required: true,
                              })}
                              className="peer sr-only"
                            />
                            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 font-bold hover:bg-blue-50 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all">
                              {v}
                            </div>
                            {q.scale_labels?.[String(v)] && (
                              <span className="text-xs text-gray-400 text-center max-w-[60px] leading-tight">
                                {q.scale_labels[String(v)]}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}

                    {/* TEXTO LIBRE */}
                    {q.question_type === "TEXTO" && (
                      <input
                        {...register(`question_${q.id}`, { required: true })}
                        className="w-full border-b border-gray-300 py-2 focus:border-blue-500 outline-none"
                        placeholder="Escribe tu respuesta..."
                      />
                    )}

                    {errors[`question_${q.id}`] && (
                      <span className="text-xs text-red-500 block mt-1">
                        Requerido
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* COMENTARIO FINAL */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              Observaciones Generales (Opcional)
            </label>
            <textarea
              {...register("general_comment")}
              rows={3}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              placeholder="Si deseas agregar algún comentario adicional..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-bold py-3 rounded-lg shadow-md transition-all ${
                isSubmitting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSubmitting ? "Enviando..." : "Enviar Evaluación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyPublicView;

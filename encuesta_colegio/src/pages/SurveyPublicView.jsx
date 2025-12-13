import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../api/axiosConfig"; // <--- CAMBIO IMPORTANTE
import { CheckCircle, User, BookOpen, Clock, AlertCircle } from "lucide-react";

const SurveyPublicView = () => {
  const { link } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    // Usamos 'api' en lugar de axios
    api
      .get(`/api/public/surveys/${link}`)
      .then((res) => setSurvey(res.data))
      .catch((err) => setError(true))
      .finally(() => setLoading(false));
  }, [link]);

  // Agrupar preguntas
  const groupedQuestions = survey
    ? survey.questions.reduce((acc, q) => {
        const cat = q.category || "Cuestionario";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(q);
        return acc;
      }, {})
    : {};

  const onSubmit = async (data) => {
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
      // Usamos 'api' aquí también
      await api.post("/api/public/submit", {
        survey_id: survey.id,
        answers: formattedAnswers,
        general_comment,
      });
      setSubmitted(true);
    } catch (e) {
      alert("Error de conexión");
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
                <User size={14} /> {survey.evaluated_name}
              </span>
            )}
            {survey.subject && (
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded">
                <BookOpen size={14} /> {survey.subject}
              </span>
            )}
            <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded">
              <Clock size={14} />{" "}
              {new Date(survey.expiration_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          {Object.entries(groupedQuestions).map(([category, questions]) => (
            <div key={category}>
              {/* TÍTULO DE SECCIÓN ELEGANTE */}
              <h3 className="text-blue-600 font-bold text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">
                {category}
              </h3>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id}>
                    <p className="text-gray-800 font-medium mb-3 text-sm md:text-base">
                      {q.question_text} <span className="text-red-400">*</span>
                    </p>

                    {/* OPCIONES TIPO DOCENTE (SET/SEP/NSE) */}
                    {q.question_type === "ESCALA_DOCENTE" && (
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            l: "SET - Totalmente",
                            v: 1,
                            c: "peer-checked:bg-green-600 peer-checked:border-green-600",
                          },
                          {
                            l: "SEP - Parcialmente",
                            v: 0.5,
                            c: "peer-checked:bg-yellow-500 peer-checked:border-yellow-500",
                          },
                          {
                            l: "NSE - No se evidencia",
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
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <label key={v} className="cursor-pointer">
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
                          </label>
                        ))}
                      </div>
                    )}

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

          {/* COMENTARIO FINAL INTEGRADO */}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all"
            >
              Enviar Evaluación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyPublicView;

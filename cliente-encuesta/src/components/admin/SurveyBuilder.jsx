import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import api from "../../api/axiosConfig";
import { localToUTC } from "../../utils/dateUtils";

const SECCIONES_DOCENTE = [
  "Parte I – Área personal y social",
  "Parte II – Aspectos administrativos",
  "Parte III – Aspectos académicos",
];

const SurveyBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cloneData = location.state?.cloneData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedLabels, setExpandedLabels] = useState({});
  const [canEditIndicators, setCanEditIndicators] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      target_audience: "ESTUDIANTE_A_DOCENTE",
      national_id: "",
      questions: [],
    },
  });

  const targetAudience = watch("target_audience");

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "questions",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user_data");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCanEditIndicators(
        user.role === "ADMIN" || user.permissions?.can_edit_indicators === true
      );
    }
  }, []);

  useEffect(() => {
    if (cloneData) {
      setValue("title", `${cloneData.title} (Copia)`);
      setValue("target_audience", cloneData.target_audience);
      setValue("description", cloneData.description || "");
      setValue("national_id", cloneData.national_id || "");
      setValue("subject", cloneData.subject || "");
      setValue("evaluated_name", cloneData.evaluated_name || "");

      const formattedQuestions = cloneData.questions_analysis.map((q) => ({
        text: q.question_text,
        type: q.question_type,
        category: q.category || "General",
        help_text: q.help_text || "",
        scale_labels: q.scale_labels || undefined,
      }));

      replace(formattedQuestions);
      toast.success("Plantilla cargada", { icon: "📋" });
    } else {
      // Default Questions Logic
      if (targetAudience === "DOCENTE_A_DOCENTE") {
        replace([
          {
            category: SECCIONES_DOCENTE[0],
            text: "Asiste puntualmente a su jornada laboral.",
            type: "ESCALA_DOCENTE",
          },
          {
            category: SECCIONES_DOCENTE[0],
            text: "Entrega de manera puntual los recaudos.",
            type: "ESCALA_DOCENTE",
          },
          {
            category: SECCIONES_DOCENTE[2],
            text: "Propicia la participación del estudiante.",
            type: "ESCALA_DOCENTE",
          },
        ]);
        setValue("title", "Acompañamiento Docente");
      } else {
        replace([
          {
            category: "General",
            text: "¿Explica con claridad los temas?",
            type: "ESCALA_1_5",
          },
        ]);
        setValue("title", "Evaluación Docente");
      }
    }
  }, [targetAudience, replace, setValue, cloneData]);

  const onSubmit = async (data) => {
    if (data.questions.length === 0) {
      toast.error("¡Agrega al menos una pregunta!", { duration: 3000 });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Guardando encuesta...");

    try {
      // Logic for Professional Schema:
      // If user selected an assignment (ID), we auto-fill the legacy fields for backup
      let payload = {
        ...data,
        expiration_date: localToUTC(data.expiration_date),
      };

      console.log("Payload before RBAC:", payload);

      // RBAC: Attach creator ID
      const storedUser = localStorage.getItem("user_data");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        payload.userId = user.id;
      }

      payload.questions = payload.questions.map((q) => ({
        ...q,
        scale_labels:
          q.scale_labels &&
          Object.values(q.scale_labels).some((v) => v?.trim())
            ? q.scale_labels
            : undefined,
      }));

      const res = await api.post("/api/surveys", payload);

      toast.dismiss(loadingToast);
      const link = `${window.location.origin}/encuesta/${res.data.link}`;
      navigator.clipboard.writeText(link);

      await Swal.fire({
        title: "¡Encuesta Creada!",
        html: `
          <p class="text-gray-600 mb-4">La encuesta se ha guardado correctamente.</p>
          <div class="bg-gray-100 p-3 rounded border text-sm text-blue-600 font-mono break-all">
            ${link}
          </div>
          <p class="text-xs text-gray-400 mt-2">Enlace copiado al portapapeles automáticamente ✨</p>
        `,
        icon: "success",
        confirmButtonText: "Ir al Panel de Control",
        confirmButtonColor: "#2563eb",
        allowOutsideClick: false,
      });

      navigate("/admin/dashboard");
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      Swal.fire({
        title: "Error",
        text: "No se pudo guardar la encuesta. Intenta nuevamente.",
        icon: "error",
      });
      setIsSubmitting(false);
    }
  };

  const renderSection = (sectionTitle) => (
    <div className="mb-8">
      <h3 className="text-blue-600 font-bold text-lg border-b border-blue-100 pb-2 mb-4">
        {sectionTitle}
      </h3>
      <div className="space-y-3">
        {fields.map((field, index) => {
          if (field.category !== sectionTitle) return null;
          return (
            <div key={field.id} className="flex gap-3 items-start group">
              <span className="text-gray-300 font-bold text-sm w-6 mt-2">
                #{index + 1}
              </span>
              <div className="flex-1">
                <input
                  {...register(`questions.${index}.text`, { required: true })}
                  className="w-full border-b border-gray-200 py-2 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Escribe el criterio..."
                />
                {canEditIndicators && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLabels((prev) => ({
                          ...prev,
                          [`section_${index}`]: !prev[`section_${index}`],
                        }))
                      }
                      className="text-xs text-blue-400 hover:text-blue-600 font-medium mt-1"
                    >
                      {expandedLabels[`section_${index}`]
                        ? "▲ Ocultar etiquetas"
                        : "▼ Personalizar etiquetas"}
                    </button>
                    {expandedLabels[`section_${index}`] && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                        <p className="text-xs font-bold text-gray-500 mb-2">
                          Etiquetas personalizadas (opcional)
                        </p>
                        {[
                          { key: "1", placeholder: "SET - Totalmente" },
                          { key: "0.5", placeholder: "SEP - Parcialmente" },
                          { key: "0", placeholder: "NSE - No se evidencia" },
                        ].map(({ key, placeholder }) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-500 w-8">
                              {key}
                            </span>
                            <input
                              {...register(
                                `questions.${index}.scale_labels.${key}`,
                              )}
                              className="flex-1 text-xs border-b border-gray-200 py-1 focus:border-blue-400 outline-none bg-transparent"
                              placeholder={placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-2"
              >
                <Trash2 size={18} />
              </button>
              <input
                type="hidden"
                {...register(`questions.${index}.type`)}
                value="ESCALA_DOCENTE"
              />
              <input
                type="hidden"
                {...register(`questions.${index}.category`)}
                value={sectionTitle}
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() =>
          append({ category: sectionTitle, text: "", type: "ESCALA_DOCENTE" })
        }
        className="mt-3 text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        <Plus size={16} /> Agregar criterio
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-sm border border-gray-200 rounded-xl mt-6 mb-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Encuesta</h2>

      <form
        onSubmit={handleSubmit(onSubmit, (errors) => {
          if (errors.title) toast.error("Falta el título");
          else if (errors.expiration_date)
            toast.error("Falta la fecha de cierre");
          else toast.error("Revisa los campos obligatorios");
        })}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Tipo de Encuesta
            </label>
            <select
              {...register("target_audience")}
              className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            >
              <option value="ESTUDIANTE_A_DOCENTE">Estudiante a Docente</option>
              <option value="DOCENTE_A_DOCENTE">Directiva a Docente</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Título de la Encuesta <span className="text-red-500">*</span>
            </label>
            <input
              {...register("title", { required: true })}
              placeholder="Ej: Evaluación Primer Lapso"
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Fecha de Cierre <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              {...register("expiration_date", { required: true })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* CAMPOS MANUALES (FALLBACK) */}
          {targetAudience === "DOCENTE_A_DOCENTE" ? (
            <>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre del Docente (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("evaluated_name", { required: true })}
                  placeholder="Nombre y Apellido"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Cédula Docente (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  {...register("national_id", { required: true, pattern: /^\d+$/ })}
                  placeholder="Ej: 12345678"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </>
          ) : (
            // ESTUDIANTE A DOCENTE
            <>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre Prof. (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("evaluated_name", { required: true })}
                  placeholder="Nombre y Apellido"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Cédula Prof. (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  {...register("national_id", { required: true, pattern: /^\d+$/ })}
                  placeholder="Ej: 12345678"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Materia (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("subject", { required: true })}
                  placeholder="Matemáticas 5to Año"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </>
          )}
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Cuestionario</h3>
          {targetAudience === "DOCENTE_A_DOCENTE" ? (
            SECCIONES_DOCENTE.map((section) => (
              <div key={section}>{renderSection(section)}</div>
            ))
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex gap-3 items-start border-b border-gray-100 pb-3"
                >
                  <span className="font-bold text-gray-400 w-6 mt-2">
                    #{index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      {...register(`questions.${index}.text`, {
                        required: true,
                      })}
                      className="w-full outline-none border-b border-gray-300 focus:border-blue-300 transition-colors py-1"
                      placeholder="Escribe la pregunta..."
                    />
                    <input
                      {...register(`questions.${index}.help_text`)}
                      className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-100 outline-none"
                      placeholder="Texto de ayuda (Opcional) - Aparecerá como tooltip para el estudiante"
                    />
                    {canEditIndicators &&
                      watch(`questions.${index}.type`) === "ESCALA_1_5" && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLabels((prev) => ({
                              ...prev,
                              [index]: !prev[index],
                            }))
                          }
                          className="text-xs text-blue-400 hover:text-blue-600 font-medium mt-1 flex items-center gap-1"
                        >
                          {expandedLabels[index]
                            ? "▲ Ocultar etiquetas"
                            : "▼ Personalizar etiquetas"}
                        </button>
                      )}
                    {canEditIndicators &&
                      watch(`questions.${index}.type`) === "ESCALA_1_5" &&
                      expandedLabels[index] && (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                          <p className="text-xs font-bold text-gray-500 mb-2">
                            Etiquetas personalizadas (opcional)
                          </p>
                          {[1, 2, 3, 4, 5].map((v) => (
                            <div key={v} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-500 w-4">
                                {v}
                              </span>
                              <input
                                {...register(
                                  `questions.${index}.scale_labels.${v}`,
                                )}
                                className="flex-1 text-xs border-b border-gray-200 py-1 focus:border-blue-400 outline-none bg-transparent"
                                placeholder={
                                  [
                                    "Totalmente en Desacuerdo",
                                    "En Desacuerdo",
                                    "Neutral",
                                    "De Acuerdo",
                                    "Totalmente de Acuerdo",
                                  ][v - 1]
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  <select
                    {...register(`questions.${index}.type`)}
                    className="text-sm bg-gray-50 border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-blue-100 outline-none mt-1"
                  >
                    <option value="ESCALA_1_5">Estrellas (1-5)</option>
                    <option value="TEXTO">Texto Libre</option>
                  </select>
                  <button
                    onClick={() => remove(index)}
                    type="button"
                    className="text-gray-300 hover:text-red-500 transition-colors mt-2"
                  >
                    <Trash2 size={18} />
                  </button>
                  <input
                    type="hidden"
                    {...register(`questions.${index}.category`)}
                    value="General"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  append({ category: "General", text: "", type: "ESCALA_1_5" })
                }
                className="text-blue-600 font-bold flex items-center gap-2 mt-4 hover:bg-blue-50 p-2 rounded-lg transition-colors w-fit"
              >
                <Plus size={18} /> Agregar Nueva Pregunta
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:bg-gray-400"
          >
            {isSubmitting ? "Guardando..." : "Crear Encuesta"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurveyBuilder;

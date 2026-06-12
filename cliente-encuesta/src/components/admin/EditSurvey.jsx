import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import api from "../../api/axiosConfig";
import { localToUTC, utcToLocal } from "../../utils/dateUtils";

const SECCIONES_DOCENTE = [
  "Parte I – Área personal y social",
  "Parte II – Aspectos administrativos",
  "Parte III – Aspectos académicos",
];

const EditSurvey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedLabels, setExpandedLabels] = useState({});

  const canEditIndicators =
    user?.role === "ADMIN" || user?.permissions?.can_edit_indicators === true;

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
      description: "",
      expiration_date: "",
      evaluated_name: "",
      national_id: "",
      subject: "",
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
    if (storedUser) setUser(JSON.parse(storedUser));

    const fetchSurvey = async () => {
      try {
        const res = await api.get(`/api/admin/surveys/${id}/edit`);
        const survey = res.data;

        setValue("title", survey.title);
        setValue("target_audience", survey.target_audience);
        setValue("description", survey.description || "");
        setValue("expiration_date", utcToLocal(survey.expiration_date));
        setValue("evaluated_name", survey.evaluated_name || "");
        setValue("national_id", survey.national_id || "");
        setValue("subject", survey.subject || "");

        const formattedQuestions = survey.questions.map((q) => ({
          id: q.id,
          text: q.question_text,
          type: q.question_type,
          category: q.category || "General",
          help_text: q.help_text || "",
          scale_labels: q.scale_labels || undefined,
        }));
        replace(formattedQuestions);

        if (survey.has_responses || survey.has_active_sessions) {
          setIsEditable(false);
          toast.error(
            "Esta encuesta no puede editarse porque tiene respuestas o está siendo respondida.",
            { duration: 6000 },
          );
        }
      } catch (error) {
        toast.error("Error al cargar la encuesta");
        navigate("/admin/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [id, setValue, replace, navigate]);

  const onSubmit = async (data) => {
    if (data.questions.length === 0) {
      toast.error("¡Agrega al menos una pregunta!");
      return;
    }
    
    setIsSaving(true);

    try {
      const selectedDate = new Date(data.expiration_date);
      const currentDate = new Date();
      const isStillActive = selectedDate > currentDate;
      const utcExpirationDate = localToUTC(data.expiration_date);

      const payload = {
        ...data,
        expiration_date: utcExpirationDate,
        userId: user?.id,
        userRole: user?.role,
        is_active: isStillActive,
      };

      payload.questions = payload.questions.map((q) => ({
        ...q,
        scale_labels:
          q.scale_labels && Object.values(q.scale_labels).some((v) => v?.trim())
            ? q.scale_labels
            : undefined,
      }));

      await api.put(`/api/surveys/${id}`, payload);

      await Swal.fire({
        title: "¡Encuesta actualizada!",
        text: "Los cambios se guardaron correctamente.",
        icon: "success",
        confirmButtonColor: "#2563eb",
      });
      navigate("/admin/dashboard");
    } catch (error) {
      setIsSaving(false);
      if (error.response?.status === 409) {
        Swal.fire("No se puede editar", error.response.data.error, "warning");
        navigate("/admin/dashboard");
      } else {
        Swal.fire("Error", "No se pudo guardar la encuesta", "error");
      }
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
                  disabled={!isEditable}
                  className={`w-full border-b border-gray-200 py-2 focus:border-blue-500 outline-none transition-colors ${
                    !isEditable
                      ? "cursor-not-allowed text-gray-400 bg-gray-50 px-2 rounded-t"
                      : ""
                  }`}
                  placeholder="Escribe el criterio..."
                />
                {canEditIndicators && isEditable && (
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
                onClick={() => remove(index)}
                type="button"
                disabled={!isEditable}
                className={`text-gray-300 hover:text-red-500 transition-colors mt-2 ${
                  !isEditable
                    ? "cursor-not-allowed opacity-50 hover:text-gray-300"
                    : ""
                }`}
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
        disabled={!isEditable} // <-- DESHABILITAR SI NO ES EDITABLE
        className={`mt-3 text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 ${
          !isEditable ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Plus size={16} /> Agregar criterio
      </button>
    </div>
  );

  if (loading)
    return <div className="text-center p-8 text-blue-600">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-sm border border-gray-200 rounded-xl mt-6 mb-12">
      {!isEditable && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertTriangle
            className="text-yellow-600 shrink-0 mt-0.5"
            size={20}
          />
          <div>
            <h3 className="font-bold text-yellow-800">Encuesta bloqueada</h3>
            <p className="text-sm text-yellow-700">
              Esta encuesta no puede editarse porque ya tiene respuestas o hay
              estudiantes respondiéndola actualmente.
            </p>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Editar Encuesta</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Tipo de Encuesta
            </label>
            <select
              {...register("target_audience")}
              disabled={!isEditable}
              className={`w-full p-2 border border-gray-300 rounded-lg ${
                !isEditable ? "bg-gray-50" : "bg-white"
              } focus:ring-2 focus:ring-blue-100 outline-none transition-all`}
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
              disabled={!isEditable}
              placeholder="Ej: Evaluación Primer Lapso"
              className={`w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none transition-colors ${
                !isEditable ? "bg-gray-50" : "bg-white"
              }`}
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

          {targetAudience === "DOCENTE_A_DOCENTE" ? (
            <>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre del Docente (Manual){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("evaluated_name", { required: true })}
                  disabled={!isEditable}
                  placeholder="Nombre y Apellido"
                  className={`w-full p-2 border border-gray-300 rounded-lg ${
                    !isEditable ? "bg-gray-50" : "bg-white"
                  }`}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Cédula Docente (Manual){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => {
                    if (
                      e.key === "-" ||
                      e.key === "e" ||
                      e.key === "+" ||
                      e.key === "."
                    ) {
                      e.preventDefault();
                    }
                  }}
                  {...register("national_id", {
                    required: true,
                    pattern: /^\d+$/,
                  })}
                  disabled={!isEditable}
                  placeholder="Ej: 12345678"
                  className={`w-full p-2 border border-gray-300 rounded-lg ${
                    !isEditable ? "bg-gray-50" : "bg-white"
                  } focus:border-blue-500 outline-none transition-colors`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre Prof. (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("evaluated_name", { required: true })}
                  disabled={!isEditable}
                  placeholder="Nombre y Apellido"
                  className={`w-full p-2 border border-gray-300 rounded-lg ${
                    !isEditable ? "bg-gray-50" : "bg-white"
                  }`}
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
                    if (
                      e.key === "-" ||
                      e.key === "e" ||
                      e.key === "+" ||
                      e.key === "."
                    ) {
                      e.preventDefault();
                    }
                  }}
                  {...register("national_id", {
                    required: true,
                    pattern: /^\d+$/,
                  })}
                  disabled={!isEditable}
                  placeholder="Ej: 12345678"
                  className={`w-full p-2 border border-gray-300 rounded-lg ${
                    !isEditable ? "bg-gray-50" : "bg-white"
                  } focus:border-blue-500 outline-none transition-colors`}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Materia (Manual) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("subject", { required: true })}
                  disabled={!isEditable}
                  placeholder="Matemáticas 5to Año"
                  className={`w-full p-2 border border-gray-300 rounded-lg ${
                    !isEditable ? "bg-gray-50" : "bg-white"
                  }`}
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
                      disabled={!isEditable}
                      className={`w-full outline-none border-b border-gray-300 focus:border-blue-300 transition-colors py-1 ${
                        !isEditable ? "bg-gray-50" : "bg-white"
                      }`}
                      placeholder="Escribe la pregunta..."
                    />
                    <input
                      {...register(`questions.${index}.help_text`)}
                      disabled={!isEditable}
                      className={`w-full text-xs text-gray-500 ${
                        !isEditable ? "bg-gray-50" : "bg-white"
                      } border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-100 outline-none`}
                      placeholder="Texto de ayuda (Opcional)"
                    />
                    {canEditIndicators &&
                      isEditable &&
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
                      isEditable &&
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
                    disabled={!isEditable}
                    className={`text-sm ${
                      !isEditable ? "bg-gray-50" : "bg-white"
                    } border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-blue-100 outline-none mt-1`}
                  >
                    <option value="ESCALA_1_5">Estrellas (1-5)</option>
                    <option value="TEXTO">Texto Libre</option>
                  </select>
                  <button
                    onClick={() => remove(index)}
                    type="button"
                    disabled={!isEditable} // ← AÑADIR
                    className={`text-gray-300 hover:text-red-500 transition-colors mt-2 ${
                      !isEditable
                        ? "cursor-not-allowed opacity-50 hover:text-gray-300"
                        : ""
                    }`}
                  >
                    <Trash2 size={18} />
                  </button>
                  <input
                    type="hidden"
                    {...register(`questions.${index}.category`)}
                    disabled={!isEditable}
                    value="General"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  append({ category: "General", text: "", type: "ESCALA_1_5" })
                }
                disabled={!isEditable}
                className={`text-blue-600 font-bold flex items-center gap-2 mt-4 hover:bg-blue-50 p-2 rounded-lg transition-colors w-fit ${
                  !isEditable ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Plus size={18} /> Agregar Nueva Pregunta
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={!isEditable || isSaving}
            className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all ${
              isEditable && !isSaving
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:-translate-y-0.5 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSurvey;

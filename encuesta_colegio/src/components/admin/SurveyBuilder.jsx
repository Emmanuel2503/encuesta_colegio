import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast"; // Para errores ligeros
import Swal from "sweetalert2"; // <--- Para el ÉXITO ROTUNDO
import api from "../../api/axiosConfig";

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
      questions: [],
    },
  });

  const targetAudience = watch("target_audience");
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "questions",
  });

  useEffect(() => {
    if (cloneData) {
      setValue("title", `${cloneData.title} (Copia)`);
      setValue("target_audience", cloneData.target_audience);
      setValue("description", cloneData.description || "");
      if (cloneData.evaluated_name)
        setValue("evaluated_name", cloneData.evaluated_name);
      if (cloneData.subject) setValue("subject", cloneData.subject);

      const formattedQuestions = cloneData.questions_analysis.map((q) => ({
        text: q.question_text,
        type: q.question_type,
        category: q.category || "General",
      }));

      replace(formattedQuestions);
      toast.success("Plantilla cargada", { icon: "📋" });
    } else {
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

  // --- NUEVA LÓGICA DE ENVÍO CON CONFIRMACIÓN MODAL ---
  const onSubmit = async (data) => {
    // 1. Validar preguntas
    if (data.questions.length === 0) {
      toast.error("¡Agrega al menos una pregunta!", { duration: 3000 });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Guardando encuesta...");

    try {
      // 2. Guardar en Backend
      const res = await api.post("/api/surveys", {
        ...data,
        expiration_date: new Date(data.expiration_date).toISOString(),
      });

      // 3. Limpiar estado de carga
      toast.dismiss(loadingToast);

      // 4. Copiar link automáticamente
      const link = `${window.location.origin}/encuesta/${res.data.link}`;
      navigator.clipboard.writeText(link);

      // 5. MOSTRAR MODAL DE ÉXITO (SweetAlert2)
      // Esto detiene la navegación hasta que el usuario hace clic en "OK"
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
        confirmButtonColor: "#2563eb", // Azul bonito
        allowOutsideClick: false, // Obliga a dar clic en el botón
      });

      // 6. Redirigir SOLO después de que cerraron el modal
      navigate("/admin/dashboard");
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);

      // Modal de Error si falla
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
            <div key={field.id} className="flex gap-3 items-center group">
              <span className="text-gray-300 font-bold text-sm w-6">
                #{index + 1}
              </span>
              <input
                {...register(`questions.${index}.text`, { required: true })}
                className="flex-1 border-b border-gray-200 py-2 focus:border-blue-500 outline-none transition-colors"
                placeholder="Escribe el criterio..."
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
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

      {/* Formulario con validador de errores visual */}
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

          {targetAudience === "DOCENTE_A_DOCENTE" ? (
            <>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre del Docente
                </label>
                <input
                  {...register("evaluated_name")}
                  placeholder="Nombre y Apellido"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Grado / Sección
                </label>
                <input
                  {...register("subject")}
                  placeholder="Ej: 4to Grado A"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre del Profesor
                </label>
                <input
                  {...register("evaluated_name")}
                  placeholder="Nombre del Profesor"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Materia
                </label>
                <input
                  {...register("subject")}
                  placeholder="Ej: Matemáticas"
                  className="w-full p-2 border border-gray-300 rounded-lg"
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
                  className="flex gap-3 items-center border-b border-gray-100 pb-3"
                >
                  <span className="font-bold text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <input
                    {...register(`questions.${index}.text`, { required: true })}
                    className="flex-1 outline-none border-b border-transparent focus:border-blue-300 transition-colors py-1"
                    placeholder="Escribe la pregunta..."
                  />
                  <select
                    {...register(`questions.${index}.type`)}
                    className="text-sm bg-gray-50 border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="ESCALA_1_5">Estrellas (1-5)</option>
                    <option value="TEXTO">Texto Libre</option>
                  </select>
                  <button
                    onClick={() => remove(index)}
                    type="button"
                    className="text-gray-300 hover:text-red-500 transition-colors"
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

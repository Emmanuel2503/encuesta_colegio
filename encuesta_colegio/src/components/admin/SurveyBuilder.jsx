import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Save, Calendar, Users, Type } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

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

  // Cargar plantillas
  // EFECTO: Cargar datos (Clonación o Plantilla por defecto)
  useEffect(() => {
    if (cloneData) {
      // A. MODO CLONACIÓN
      // Rellenamos el formulario con los datos de la encuesta vieja
      setValue("title", `${cloneData.title} (Copia)`); // Agregamos "(Copia)" para que se note
      setValue("target_audience", cloneData.target_audience);
      setValue("description", cloneData.description || "");

      // Si es docente a docente, rellenamos los campos extra
      if (cloneData.evaluated_name)
        setValue("evaluated_name", cloneData.evaluated_name);
      if (cloneData.subject) setValue("subject", cloneData.subject);

      // Mapeamos las preguntas para que coincidan con el formato del formulario
      const formattedQuestions = cloneData.questions_analysis.map((q) => ({
        text: q.question_text, // En la BD se llama question_text
        type: q.question_type, // En la BD se llama question_type
        category: q.category || "General",
      }));

      replace(formattedQuestions);

      // Nota: No copiamos la fecha de expiración para obligar a poner una nueva
    } else {
      // B. MODO NUEVA ENCUESTA (Tu lógica anterior)
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
    // Agregamos 'cloneData' a las dependencias para que solo corra una vez
  }, [targetAudience, replace, setValue, cloneData]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        expiration_date: new Date(data.expiration_date).toISOString(),
      };
      const res = await axios.post(
        "http://localhost:3000/api/surveys",
        payload
      );
      const link = `${window.location.origin}/encuesta/${res.data.link}`;
      navigator.clipboard.writeText(link);
      alert(`✅ Encuesta creada.\nLink: ${link}`);
      navigate("/admin/dashboard");
    } catch (e) {
      alert("Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizado limpio de secciones
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="text-sm font-semibold text-gray-600">
              Tipo de Encuesta
            </label>
            <select
              {...register("target_audience")}
              className="w-full mt-1 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="ESTUDIANTE_A_DOCENTE">Estudiante a Docente</option>
              <option value="DOCENTE_A_DOCENTE">Directiva a Docente</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <input
              {...register("title")}
              placeholder="Título de la Encuesta"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <input
              type="datetime-local"
              {...register("expiration_date")}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {/* Campos dinámicos de nombres */}
          {targetAudience === "DOCENTE_A_DOCENTE" ? (
            <>
              <input
                {...register("evaluated_name")}
                placeholder="Nombre del Docente"
                className="p-2 border rounded-lg"
              />
              <input
                {...register("subject")}
                placeholder="Grado / Sección"
                className="p-2 border rounded-lg"
              />
            </>
          ) : (
            <>
              <input
                {...register("evaluated_name")}
                placeholder="Nombre del Profesor"
                className="p-2 border rounded-lg"
              />
              <input
                {...register("subject")}
                placeholder="Materia"
                className="p-2 border rounded-lg"
              />
            </>
          )}
        </div>

        {/* ÁREA DE PREGUNTAS */}
        <div className="pt-4">
          {targetAudience === "DOCENTE_A_DOCENTE" ? (
            SECCIONES_DOCENTE.map((section) => (
              <div key={section}>{renderSection(section)}</div>
            ))
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex gap-2 items-center border-b pb-2"
                >
                  <span className="font-bold text-gray-400">#{index + 1}</span>
                  <input
                    {...register(`questions.${index}.text`)}
                    className="flex-1 outline-none"
                    placeholder="Pregunta..."
                  />
                  <select
                    {...register(`questions.${index}.type`)}
                    className="text-sm bg-gray-50 rounded p-1"
                  >
                    <option value="ESCALA_1_5">Estrellas</option>
                    <option value="TEXTO">Texto</option>
                  </select>
                  <button
                    onClick={() => remove(index)}
                    type="button"
                    className="text-red-400"
                  >
                    <Trash2 size={16} />
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
                className="text-blue-600 font-bold flex items-center gap-2 mt-2"
              >
                <Plus size={18} /> Agregar Pregunta
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all"
          >
            {isSubmitting ? "Guardando..." : "Crear Encuesta"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurveyBuilder;

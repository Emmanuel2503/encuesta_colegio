import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  Users,
  Loader2,
  FileText,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig"; // <--- CAMBIO IMPORTANTE
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // <---orm "jspdf-autotable";
import * as XLSX from "xlsx";

const ResultsView = () => {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("bar"); // "bar" | "pie"

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

  //--- Función para generar PDF ---
  const generatePDF = () => {
    if (!selectedSurvey) return;

    const doc = new jsPDF();

    const optionMap = {
      1: "1 - Totalmente en Desacuerdo",
      2: "2 - En Desacuerdo",
      3: "3 - Neutral",
      4: "4 - De Acuerdo",
      5: "5 - Totalmente de Acuerdo",
      SET: "SET (1)",
      SEP: "SEP (0.5)",
      NSE: "NSE (0)",
    };

    const orderedKeys = ["1", "2", "3", "4", "5", "SET", "SEP", "NSE"];
    const globalTotals = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      SET: 0,
      SEP: 0,
      NSE: 0,
    };

    // Título del reporte
    doc.setFontSize(18);
    doc.text("Reporte de Resultados", 14, 20);

    doc.setFontSize(12);
    doc.text(`Encuesta: ${selectedSurvey.title}`, 14, 30);
    doc.text(`Evaluado: ${selectedSurvey.evaluated_name || "N/A"}`, 14, 36);
    doc.text(`Materia: ${selectedSurvey.subject || "N/A"}`, 14, 42);
    doc.text(
      `Fecha de descagar del reporte: ${new Date().toLocaleDateString()}`,
      14,
      48,
    );

    let finalY = 55; // Posición vertical inicial

    selectedSurvey.questions_analysis.forEach((q, index) => {
      // Título de la pregunta
      doc.setFontSize(11);
      doc.setTextColor(0, 50, 150);
      doc.setFont("helvetica", "bold");

      // Verificamos si necesitamos nueva página
      if (finalY > 270) {
        doc.addPage();
        finalY = 20;
      }

      doc.text(`Pregunta ${index + 1}: ${q.question_text}`, 14, finalY);

      // Preparamos datos
      const tableRows =
        q.data && q.data.length > 0
          ? q.data.map((item) => {
            const raw = (item.name || "").toString();
            const key = raw.replace("⭐", "").trim();

            const label =
              optionMap[key] || optionMap[key.toUpperCase()] || raw;
            const cleanKey = key.toUpperCase();
            if (globalTotals.hasOwnProperty(cleanKey)) {
              globalTotals[cleanKey] += Number(item.value);
            }

            return [label, item.value.toString()];
          })
          : [["Sin datos", "0"]];

      // --- AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL ---
      // Pasamos 'doc' como primer argumento
      autoTable(doc, {
        startY: finalY + 5,
        head: [["Opción de Respuesta", "Cantidad de Votos"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          finalY = data.cursor.y + 15;
        },
      });

      // Actualizamos finalY
      finalY = doc.lastAutoTable.finalY + 15;
    });

    // Tabla de resumen final
    if (finalY > 270) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMEN TOTAL GENERAL", 14, finalY);

    const summaryRows = orderedKeys.map((key) => {
      return [optionMap[key], globalTotals[key]];
    });

    const grandTotal = Object.values(globalTotals).reduce((a, b) => a + b, 0);
    summaryRows.push(["TOTAL GENERAL", grandTotal]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Categoría", "Total Acumulado"]],
      body: summaryRows,
      theme: "grid",
      headStyles: { fillColor: [42, 62, 80] },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: "auto", halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

    const teahcerName = selectedSurvey.evaluated_name.replace(/,/g, "_").trim();

    doc.save(`Reporte_${teahcerName}_${dateStr}.pdf`);
  };

  //--- Función para generar Excel ---
  const generateExcel = () => {
    if (!selectedSurvey) return;

    const optionMap = {
      1: "1 - Totalmente en Desacuerdo",
      2: "2 - En Desacuerdo",
      3: "3 - Neutral",
      4: "4 - De Acuerdo",
      5: "5 - Totalmente de Acuerdo",
      SET: "SET (1)",
      SEP: "SEP (0.5)",
      NSE: "NSE (0)",
    };

    //Lista para iterar en orden específico al final
    const orderedKeys = ["1", "2", "3", "4", "5", "SET", "SEP", "NSE"];
    const globalTotals = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      SET: 0,
      SEP: 0,
      NSE: 0,
    };

    //1. Se prepara la data en un formato plano
    const excelData = [];

    // Encabezados generales
    excelData.push({ A: "REPORTE DE ENCUESTA", B: "" });
    excelData.push({ A: "Título:", B: selectedSurvey.title });
    excelData.push({
      A: "Evaluado:",
      B: selectedSurvey.evaluated_name || "N/A",
    });
    excelData.push({ A: "Materia:", B: selectedSurvey.subject || "N/A" });
    excelData.push({
      A: "Fecha descarga del reporte:",
      B: new Date().toLocaleDateString(),
    });
    excelData.push({}); // Fila vacía

    //Iteración por preguntas
    selectedSurvey.questions_analysis.forEach((q, index) => {
      excelData.push({ A: `PREGUNTA ${index + 1}:`, B: q.question_text });
      excelData.push({ A: "Opción", B: "Cantidad" }); //Cabecera de tabla interna

      if (q.data && q.data.length > 0) {
        q.data.forEach((item) => {
          const rawItemName = (item.name || "").toString(); // Aseguramos que sea string

          const key = rawItemName.replace("⭐", "").trim(); // Eliminamos +P si existe

          const label = optionMap[key] || rawItemName;

          excelData.push({ A: label, B: item.value });

          if (globalTotals.hasOwnProperty(key)) {
            globalTotals[key] += item.value;
          }
        });
      } else {
        excelData.push({ A: "Sin datos", B: 0 });
      }
      excelData.push({ A: "", B: "" }); //Espacio entre preguntas
    });

    //--Resumen total al final--
    excelData.push({ A: "", B: "" });
    excelData.push({ A: "RESUMEN TOTAL GENERAL", B: "" });
    excelData.push({ A: "Categoría", B: "Total Votos" });

    orderedKeys.forEach((key) => {
      excelData.push({ A: optionMap[key], B: globalTotals[key] });
    });

    const grandTotal = Object.values(globalTotals).reduce((a, b) => a + b, 0);
    excelData.push({ A: "TOTAL GENERAL", B: grandTotal });

    //2. Crear la hoja de cálculo/trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });

    //Ajuste del ancho de las columnas
    const wscols = [{ wch: 40 }, { wch: 15 }];
    worksheet["!cols"] = wscols;

    //3. Crear el libro y descargar
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");

    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

    const teahcerName = selectedSurvey.evaluated_name.replace(/,/g, "_").trim();

    XLSX.writeFile(workbook, `Reporte_${teahcerName}_${dateStr}.xlsx`);
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

          <div className="flex flex-wrap items-center gap-3">
            {/* --- TOGGLE TIPO DE GRÁFICO --- */}
            <div className="bg-white p-1 rounded-lg border flex shadow-sm mr-2">
              <button
                onClick={() => setChartType("bar")}
                className={`p-2 rounded-md transition-colors ${chartType === "bar"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
                  }`}
                title="Ver gráfico de barras"
              >
                <BarChartIcon size={20} />
              </button>
              <button
                onClick={() => setChartType("pie")}
                className={`p-2 rounded-md transition-colors ${chartType === "pie"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
                  }`}
                title="Ver gráfico de torta"
              >
                <PieChartIcon size={20} />
              </button>
            </div>

            {/* --- BLOQUE DE BOTONES DE EXPORTACIÓN --- */}
            <button
              onClick={generateExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm font-medium"
            >
              <FileText size={18} /> PDF
            </button>
          </div>
        </div>

        {/* Bloque de Muestras (Movido un poco para acomodar botones, o puedes dejarlo al lado) */}
        <div className="mt-4 flex justify-end">
          <div className="bg-white px-6 py-3 rounded-lg shadow-sm border text-center inline-block">
            <span className="block text-3xl font-bold text-blue-600">
              {selectedSurvey.questions_analysis[0]?.data.reduce(
                (acc, curr) => acc + curr.value,
                0,
              ) || 0}
            </span>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Muestras
            </span>
          </div>
        </div>
      </div>

      {/* LEYENDA PARA LA VISTA DE RESULTADOS */}
      <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Leyenda de Escala (1-5)
        </h4>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <b>1:</b> Totalmente en Desacuerdo
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <b>2:</b> En Desacuerdo
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <b>3:</b> Neutral
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <b>4:</b> De Acuerdo
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <b>5:</b> Totalmente de Acuerdo
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
                  {chartType === "bar" ? (
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
                  ) : (
                    <PieChart>
                      <Pie
                        data={question.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {question.data.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={i >= 3 ? "#3b82f6" : "#9ca3af"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  )}
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

-- VIEWS
-- Revisar las vistas creadas en la base de datos.
-- Crear otras vistas sí es necesario.

-- Vista para gráficas de estudiantes (por pregunta)
CREATE OR REPLACE VIEW vista_graficas_estudiantes AS
SELECT 
    e.id AS encuesta_id,
    e.codigo,
    d.nombres || ' ' || d.apellidos AS docente,
    a.nombre AS asignatura,
    pe.id AS pregunta_id,
    pe.numero_orden,
    pe.texto AS pregunta,
    pe.categoria,
    re.total_respuestas,
    re.promedio,
    re.distribucion
FROM encuestas_estudiantes e
JOIN docentes d ON e.docente_evaluado_id = d.id
JOIN asignaturas a ON e.asignatura_id = a.id
JOIN preguntas_estudiantes pe ON e.id = pe.encuesta_id
LEFT JOIN resultados_estudiantes re ON e.id = re.encuesta_id AND pe.id = re.pregunta_id
WHERE e.activa = true;

-- Vista para reporte docente-docente completo
CREATE OR REPLACE VIEW vista_reporte_docente_docente AS
SELECT 
    edd.id AS evaluacion_id,
    edd.codigo,
    pa.nombre AS periodo,
    d1.nombres || ' ' || d1.apellidos AS acompaniante,
    d2.nombres || ' ' || d2.apellidos AS acompaniado,
    a.nombre AS asignatura,
    edd.grado,
    edd.seccion,
    edd.fecha_evaluacion,
    sed.codigo AS codigo_seccion,
    sed.nombre AS seccion_nombre,
    rd.total_puntos,
    rd.maximo_puntos,
    rd.porcentaje,
    CASE 
        WHEN rd.porcentaje >= 85 THEN 'Excelente'
        WHEN rd.porcentaje >= 70 THEN 'Satisfactorio'
        WHEN rd.porcentaje >= 50 THEN 'Regular'
        ELSE 'Necesita Mejora'
    END AS calificacion_cualitativa
FROM evaluaciones_docente_docente edd
JOIN periodos_academicos pa ON edd.periodo_id = pa.id
JOIN docentes d1 ON edd.docente_acompaniante_id = d1.id
JOIN docentes d2 ON edd.docente_acompaniado_id = d2.id
LEFT JOIN asignaturas a ON edd.asignatura_id = a.id
LEFT JOIN resultados_docentes rd ON edd.id = rd.evaluacion_id
LEFT JOIN secciones_evaluacion_docente sed ON rd.seccion_id = sed.id
ORDER BY edd.fecha_evaluacion DESC;
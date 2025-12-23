-- Posibles datos de ejemplo para la base de datos.
-- Insertar datos en las tablas creadas en schema/01_tables.sql
-- =============================================

-- Posibles valores predeterminados para encuesta de estudiantes
INSERT INTO preguntas_estudiantes (numero_orden, texto, categoria) VALUES
(1, 'La presentación personal fue', 'Presentación'),
(2, 'Asiste a clases con puntualidad de manera', 'Puntualidad'),
(3, 'Cumplió con la programación de manera', 'Planificación'),
(4, 'Al inicio del momento informó del plan de evaluación', 'Evaluación'),
(5, 'Cumple con el plan de evaluación de manera', 'Evaluación'),
(6, 'Informa de los resultados de evaluación de manera', 'Evaluación'),
(7, 'Los ítems de las evaluaciones se corresponden con los temas tratados', 'Evaluación'),
(8, 'Concede el derecho a revisar los resultados de las evaluaciones', 'Evaluación'),
(9, 'Realiza la apertura y desarrollo del tema de la clase de manera', 'Metodología'),
(10, 'El cierre de la clase se realiza con conclusiones del tema en desarrollo', 'Metodología'),
(11, 'Utiliza la pizarra de manera', 'Recursos'),
(12, 'Relaciona los contenidos con situaciones reales de manera', 'Metodología'),
(13, 'La orientación suministrada por el docente responde a las necesidades', 'Metodología'),
(14, 'Su dominio del grupo es', 'Disciplina'),
(15, 'Responde todas las preguntas de manera', 'Comunicación'),
(16, 'Propicia la participación crítica de los estudiantes de manera', 'Participación'),
(17, 'Orienta a los estudiantes en el uso de las fuentes de información', 'Metodología'),
(18, 'La claridad de sus exposiciones es', 'Comunicación'),
(19, 'La comunicación con los estudiantes es', 'Comunicación'),
(20, 'Su conocimiento técnico de la materia es', 'Competencia');

-- Insertar secciones según la imagen
INSERT INTO secciones_evaluacion_docente (codigo, nombre, descripcion, orden) VALUES
('I', 'Aspectos Personales y Actitudinales', 'Comportamiento y actitud del docente', 1),
('II', 'Aspectos Organizativos', 'Organización y cumplimiento de labores', 2),
('III', 'Aspectos Académicos', 'Desempeño académico y pedagógico', 3),
('SD', 'Secuencia Didáctica', 'Evaluación de la planificación de clases', 4);

-- Insertar preguntas según la imagen (simplificado - puedes agregar más)
INSERT INTO preguntas_docentes (seccion_id, numero_orden, texto) VALUES
-- Sección I: Aspectos Personales y Actitudinales
(1, 1, 'Asiste puntualmente a su jornada laboral'),
(1, 2, 'Asiste puntualmente a su salón de clases'),
(1, 3, 'Uso correcto del uniforme'),
(1, 4, 'Buena presentación personal'),
(1, 5, 'Asume sus errores y se responsabiliza de ellos'),
(1, 6, 'Utiliza un lenguaje verbal y corporal respetuoso y asertivo'),
(1, 7, 'Participa en actividades culturales, escolares y del carisma'),
(1, 8, 'Establece relaciones amables y respetuosas con compañeros'),
(1, 9, 'Plantea con respeto inquietudes a su inmediato superior'),
(1, 10, 'Colabora en preparación de eventos especiales'),

-- Sección II: Aspectos Organizativos
(2, 1, 'Garantiza que los estudiantes cumplan con acuerdos, uniforme y permanencia'),
(2, 2, 'El buen estado del mobiliario y la limpieza de aula'),
(2, 3, 'Notifica con antelación permisos por citas médicas'),
(2, 4, 'Presenta justificativos escritos de permisos'),
(2, 5, 'Entrega puntualmente planificación, evaluación y calificaciones'),
(2, 6, 'Informa a estudiantes acerca de los pares de evaluación'),
(2, 7, 'Sigue al pie de la letra el plan de evaluación'),
(2, 8, 'Informa ajustes de planes de evaluación'),
(2, 9, 'Sigue lineamientos de coordinadoras'),
(2, 10, 'Mantiene comunicación con el departamento'),
(2, 11, 'Lleva acta y control de reuniones y asesorías'),
(2, 12, 'Levanta incidencias de eventos ocurridos'),
(2, 13, 'Lleva registro de asistencia y comportamiento'),
(2, 14, 'Muestra buen desempeño en gestión de secciones'),

-- Sección III: Aspectos Académicos
(3, 1, 'Comunicación: Interrelación docente-estudiante'),
(3, 2, 'Propicia la participación del estudiante'),
(3, 3, 'Demuestra apertura a sugerencias de estudiantes'),
(3, 4, 'Contesta con respeto y sin alzar la voz'),
(3, 5, 'Trata con respeto a todos los estudiantes'),
(3, 6, 'Explica manteniendo la atención de estudiantes'),
(3, 7, 'Evidencia motivación individual cuando amerita'),
(3, 8, 'Valora explícitamente el esfuerzo de estudiantes'),

-- Sección SD: Secuencia Didáctica
(4, 1, 'Utiliza estrategias para precisar conocimientos previos', 'Inicio'),
(4, 2, 'Toma en cuenta la experiencia previa del estudiante', 'Inicio'),
(4, 3, 'Presenta instrucciones al inicio de actividades', 'Inicio'),
(4, 4, 'Presenta variedad de actividades para participación y creatividad', 'Desarrollo'),
(4, 5, 'Contiene orden secuencial de actividades y contenidos', 'Desarrollo'),
(4, 6, 'Posee dominio del contenido a desarrollar', 'Desarrollo'),
(4, 7, 'Posee dominio de la estrategia metodológica', 'Desarrollo'),
(4, 8, 'Invita a alumnos a realizar conclusiones', 'Cierre'),
(4, 9, 'Realiza el cierre de la clase adecuadamente', 'Cierre');

-- Insertar períodos académicos
INSERT INTO periodos_academicos (año, numero_lapso, fecha_inicio, fecha_fin, activo) VALUES
(2024, 1, '2024-01-15', '2024-04-15', true),
(2024, 2, '2024-04-16', '2024-08-16', false),
(2024, 3, '2024-08-17', '2024-12-20', false);

-- Insertar docentes de ejemplo
INSERT INTO docentes (cedula, nombres, apellidos, email) VALUES
('V-12345678', 'María', 'López', 'mlopez@colegio.edu'),
('V-87654321', 'Carlos', 'González', 'cgonzalez@colegio.edu'),
('V-11223344', 'Ana', 'Fernández', 'afernandez@colegio.edu'),
('V-55667788', 'Melsy', 'Rojas', 'mrojas@colegio.edu'); -- Docente de Química de la imagen

-- Insertar asignaturas
INSERT INTO asignaturas (codigo, nombre, nivel_educativo) VALUES
('QUI-101', 'Química', 'Media General'),
('MAT-101', 'Matemáticas', 'Media General'),
('FIS-101', 'Física', 'Media General'),
('LEN-101', 'Lengua y Literatura', 'Media General');

-- Insertar encuesta de ejemplo para estudiantes
INSERT INTO encuestas_estudiantes (codigo, periodo_id, asignatura_id, docente_evaluado_id, seccion, fecha_apertura, fecha_cierre, link_acceso) VALUES
('ENC-EST-2024-001', 1, 1, 4, 'A', '2024-03-01', '2024-03-15', 'http://localhost:5173/encuesta/ENC-EST-2024-001');

-- Insertar evaluación docente-docente de ejemplo
INSERT INTO evaluaciones_docente_docente (codigo, periodo_id, docente_acompaniante_id, docente_acompaniado_id, asignatura_id, grado, seccion, fecha_evaluacion) VALUES
('EVAL-DOC-2024-001', 1, 2, 1, 2, '1er Año', 'B', '2024-03-10');
-- Create Tables and Contraints
--REVISAR Y AJUSTAR SEGÚN NECESIDADES ESPECÍFICAS DEL PROYECTO

-- =============================================
-- 0. TABLA DE CONFIGURACIÓN ADMIN
-- =============================================

CREATE TABLE admin_settings(
    id_admin_setting SERIAL PRIMARY KEY,
    pin_code VARCHAR(50) NOT NULL
);

-- =============================================
-- 1. TABLAS PRINCIPALES
-- =============================================

-- Tabla de períodos académicos (3 lapsos)
CREATE TABLE periodos_academicos (
    id_periodo_academico SERIAL PRIMARY KEY,
    years INTEGER NOT NULL,
    numero_lapso INTEGER NOT NULL,
    nombre_periodo_academico VARCHAR(50) GENERATED ALWAYS AS (years || '-Lapso-' || numero_lapso) STORED, --Generado automáticamente, solo necesita año y número de lapso
    fecha_inicio_periodo_academico DATE NOT NULL,
    fecha_fin_periodo_academico DATE NOT NULL,
    activo_periodo_academico BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_fechas_periodo CHECK (fecha_inicio_periodo_academico < fecha_fin_periodo_academico),
    CONSTRAINT chk_numero_lapso CHECK (numero_lapso BETWEEN 1 AND 3),
    CONSTRAINT unico_periodo_academico UNIQUE (years, numero_lapso)
);

-- Tabla de docentes
CREATE TABLE docentes (
    id_docente SERIAL PRIMARY KEY,
    cedula_docente VARCHAR(20) UNIQUE NOT NULL,
    nombres_docente VARCHAR(100) NOT NULL,
    apellidos_docente VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    activo_docente BOOLEAN DEFAULT true,
    
    CONSTRAINT chk_email_valido CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT chk_telefono_valido CHECK (telefono ~* '^\+?[0-9\s\-()]{7,15}$' OR telefono IS NULL),
    CONSTRAINT chk_fecha_ingreso CHECK (fecha_ingreso <= CURRENT_DATE),
    CONSTRAINT chk_nombres_docente CHECK (char_length(nombres_docente) BETWEEN 2 AND 100),
    CONSTRAINT chk_apellidos_docente CHECK (char_length(apellidos_docente) BETWEEN 2 AND 100)
);

-- Tabla de asignaturas
CREATE TABLE asignaturas (
    id_asignatura SERIAL PRIMARY KEY,
    codigo_asignatura VARCHAR(20) UNIQUE NOT NULL,
    nombre_asignatura VARCHAR(150) NOT NULL,
    nivel_educativo VARCHAR(50) NOT NULL,
    activa BOOLEAN DEFAULT true,

    CONSTRAINT chk_nombre_asignatura CHECK (char_length(nombre_asignatura) BETWEEN 2 AND 150),
    CONSTRAINT chk_codigo_asignatura CHECK (char_length(codigo_asignatura) BETWEEN 2 AND 20),
    CONSTRAINT chk_nivel_educativo CHECK (nivel_educativo IN ('Media General', 'Educación Media', 'Educación Básica'))
);

-- =============================================
-- 2. TABLAS PARA ENCUESTA ESTUDIANTES (Escala 1-5)
-- =============================================

CREATE TABLE encuestas_estudiantes (
    id_encuesta_estudiante SERIAL PRIMARY KEY,
    codigo_encuesta_estudiante VARCHAR(50) UNIQUE NOT NULL,
    periodo_id INTEGER NOT NULL,
    asignatura_id INTEGER NOT NULL,
    docente_evaluado_id INTEGER NOT NULL,
    seccion_encuesta_estudiante VARCHAR(10) NOT NULL,
    fecha_apertura DATE NOT NULL,
    fecha_cierre DATE NOT NULL,
    titulo_encuesta_estudiante VARCHAR(200) DEFAULT 'Evaluación de Profesores por los Estudiantes',
    activa_encuesta_estudiante BOOLEAN DEFAULT true,
    link_acceso VARCHAR(500),
    
    CONSTRAINT chk_fechas_encuesta CHECK (fecha_apertura <= fecha_cierre),
    CONSTRAINT chk_seccion_encuesta CHECK (char_length(seccion_encuesta_estudiante) BETWEEN 1 AND 10),
    CONSTRAINT fk_periodo_encuesta_estudiante FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id_periodo_academico),
    CONSTRAINT fk_asignatura_encuesta_estudiante FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id_asignatura),
    CONSTRAINT fk_docente_encuesta_estudiante FOREIGN KEY (docente_evaluado_id) REFERENCES docentes(id_docente)
);

-- Preguntas específicas para estudiantes (según imagen: 20 indicadores)
CREATE TABLE preguntas_estudiantes (
    id_pregunta_estudiante SERIAL PRIMARY KEY,
    encuesta_pregunta_estudiante_id INTEGER NOT NULL,
    numero_orden_pregunta_estudiante INTEGER NOT NULL,
    texto_pregunta_estudiante TEXT NOT NULL,
    categoria VARCHAR(100), -- Ej: 'Presentación', 'Puntualidad', 'Evaluación', 'Metodología'
    tipo_escala VARCHAR(20) DEFAULT 'LIKERT_5',

    CONSTRAINT unico_orden_encuesta UNIQUE (encuesta_pregunta_estudiante_id, numero_orden_pregunta_estudiante),
    CONSTRAINT fk_pregunta_encuesta_estudiante FOREIGN KEY (encuesta_pregunta_estudiante_id) REFERENCES encuestas_estudiantes(id_encuesta_estudiante) ON DELETE CASCADE,
    CONSTRAINT chk_tipo_escala CHECK (tipo_escala IN ('LIKERT_5'))
);

-- Respuestas de estudiantes (Escala 1-5 con decimales como en la imagen)
CREATE TABLE respuestas_estudiantes (
    id_respuesta_estudiante SERIAL PRIMARY KEY,
    encuesta_respuesta_estudiante_id INTEGER NOT NULL,
    pregunta_respuesta_estudiante_id INTEGER NOT NULL,
    valor DECIMAL(3,1) NOT NULL, -- Ej: 3.5, 4.8 como en la imagen
    estudiante_hash VARCHAR(100), -- Hash para anonimato pero control de único voto
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    
    CONSTRAINT unico_voto_pregunta UNIQUE (encuesta_respuesta_estudiante_id, pregunta_respuesta_estudiante_id, estudiante_hash),
    CONSTRAINT fk_respuesta_encuesta_estudiante FOREIGN KEY (encuesta_respuesta_estudiante_id) REFERENCES encuestas_estudiantes(id_encuesta_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_respuesta_pregunta_estudiante FOREIGN KEY (pregunta_respuesta_estudiante_id) REFERENCES preguntas_estudiantes(id_pregunta_estudiante),
    CONSTRAINT chk_valor_decimal CHECK (valor >= 1 AND valor <= 5)

);

-- =============================================
-- 3. TABLAS PARA EVALUACIÓN DOCENTE-DOCENTE (SET/SEP/NSE)
-- =============================================

CREATE TABLE evaluaciones_docente_docente (
    id_evaluacion_docente SERIAL PRIMARY KEY,
    codigo_evaluacion_docente VARCHAR(50) UNIQUE NOT NULL,
    periodo_evaluacion_docente_id INTEGER,
    docente_acompaniante_id INTEGER NOT NULL,
    docente_evaluado_id INTEGER NOT NULL,
    asignatura_evaluacion_docente_id INTEGER,
    grado VARCHAR(20),
    seccion_evaluacion_docente VARCHAR(10),
    fecha_evaluacion DATE NOT NULL,
    titulo_evaluacion_docente VARCHAR(200) DEFAULT 'Acompañamiento del Desempeño Docente',
    hora_inicio TIME,
    hora_fin TIME,
    observaciones_evaluacion_docente TEXT,
    total_puntos_evaluación_docente DECIMAL(5,2),
    porcentaje_obtenido DECIMAL(5,2),
    fecha_registro_evaluacion_docente TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_docentes_diferentes CHECK (docente_acompaniante_id != docente_evaluado_id),
    CONSTRAINT chk_fechas_horas_evaluacion CHECK (hora_inicio < hora_fin OR hora_inicio IS NULL OR hora_fin IS NULL),
    CONSTRAINT fk_periodo_evaluacion_docente FOREIGN KEY (periodo_evaluacion_docente_id) REFERENCES periodos_academicos(id_periodo_academico),
    CONSTRAINT fk_docente_acompaniante FOREIGN KEY (docente_acompaniante_id) REFERENCES docentes(id_docente),
    CONSTRAINT fk_docente_evaluado FOREIGN KEY (docente_evaluado_id) REFERENCES docentes(id_docente),
    CONSTRAINT fk_asignatura_evaluacion_docente FOREIGN KEY (asignatura_evaluacion_docente_id) REFERENCES asignaturas(id_asignatura)
);

-- Secciones del formulario docente (I, II, III partes)
CREATE TABLE secciones_evaluacion_docente (
    id_seccion_evaluacion_docente SERIAL PRIMARY KEY,
    codigo_seccion_evaluacion_docente VARCHAR(10) NOT NULL UNIQUE,
    nombre_seccion_evaluacion_docente VARCHAR(100) NOT NULL,
    descripcion_seccion_evaluacion_docente TEXT,
    orden_seccion_evaluacion_docente INTEGER NOT NULL  
);

-- Preguntas para evaluación docente-docente (SET/SEP/NSE)
CREATE TABLE preguntas_docentes (
    id_pregunta_docente SERIAL PRIMARY KEY,
    seccion_pregunta_docente_id INTEGER NOT NULL,
    numero_orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    descripcion TEXT, -- Para preguntas con sub-ítems
    valor_set DECIMAL(3,2) DEFAULT 1.00,
    valor_sep DECIMAL(3,2) DEFAULT 0.50,
    valor_nse DECIMAL(3,2) DEFAULT 0.00,
    fase_secuencia VARCHAR(50),
    
    CONSTRAINT chk_fase_secuencia CHECK (fase_secuencia IN ('Inicio', 'Desarrollo', 'Cierre')), -- Solo para sección SD
    CONSTRAINT fk_seccion_pregunta_docente FOREIGN KEY (seccion_pregunta_docente_id) REFERENCES secciones_evaluacion_docente(id_seccion_evaluacion_docente) ON DELETE CASCADE,
    CONSTRAINT unico_orden_seccion UNIQUE (seccion_pregunta_docente_id, numero_orden)
);

-- Respuestas de evaluación docente-docente
CREATE TABLE respuestas_docentes (
    id_respuesta_docente SERIAL PRIMARY KEY,
    evaluacion_respuesta_docente_id INTEGER NOT NULL,
    pregunta_respuesta_docente_id INTEGER NOT NULL,
    valor_seleccionado VARCHAR(10) NOT NULL, -- 'SET', 'SEP', 'NSE'
    valor_puntos DECIMAL(3,2), -- Calculado automáticamente: 1.00, 0.50, 0.00
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unica_respuesta UNIQUE (evaluacion_respuesta_docente_id, pregunta_respuesta_docente_id),
    CONSTRAINT fk_evaluacion_respuesta_docente FOREIGN KEY (evaluacion_respuesta_docente_id) REFERENCES evaluaciones_docente_docente(id_evaluacion_docente) ON DELETE CASCADE,
    CONSTRAINT fk_pregunta_respuesta_docente FOREIGN KEY (pregunta_respuesta_docente_id) REFERENCES preguntas_docentes(id_pregunta_docente),
    CONSTRAINT chk_valor_seleccionado CHECK (valor_seleccionado IN ('SET', 'SEP', 'NSE'))
);

-- =============================================
-- 4. TABLAS DE RESULTADOS Y REPORTES
-- =============================================

-- Resultados agregados para estudiantes (para gráficas rápidas)
CREATE TABLE resultados_estudiantes (
    id_resultado_estudiante SERIAL PRIMARY KEY,
    encuesta_resultado_estudiante_id INTEGER,
    pregunta_resultado_estudiante_id INTEGER,
    total_respuestas INTEGER DEFAULT 0,
    promedio DECIMAL(4,2),
    moda DECIMAL(3,1),
    distribucion JSONB, -- Ej: {"5": 10, "4.5": 5, "4": 8, ...}
    fecha_actualizacion_resultado_estudiante TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(encuesta_resultado_estudiante_id, pregunta_resultado_estudiante_id),
    CONSTRAINT fk_encuesta_resultado_estudiante FOREIGN KEY (encuesta_resultado_estudiante_id) REFERENCES encuestas_estudiantes(id_encuesta_estudiante),
    CONSTRAINT fk_pregunta_resultado_estudiante FOREIGN KEY (pregunta_resultado_estudiante_id) REFERENCES preguntas_estudiantes(id_pregunta_estudiante)
);

-- Resultados agregados para docentes
CREATE TABLE resultados_docentes (
    id_resultado_docente SERIAL PRIMARY KEY,
    evaluacion_resultado_docente_id INTEGER REFERENCES evaluaciones_docente_docente(id_evaluacion_docente),
    seccion_id INTEGER REFERENCES secciones_evaluacion_docente(id_seccion_evaluacion_docente),
    total_preguntas INTEGER,
    total_puntos_resultado_docente DECIMAL(6,2),
    maximo_puntos DECIMAL(6,2),
    porcentaje DECIMAL(5,2),
    fecha_actualizacion_resultado_docente TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(evaluacion_resultado_docente_id, seccion_id),
    CONSTRAINT fk_evaluacion_resultado_docente FOREIGN KEY (evaluacion_resultado_docente_id) REFERENCES evaluaciones_docente_docente(id_evaluacion_docente),
    CONSTRAINT fk_seccion_resultado_docente FOREIGN KEY (seccion_id) REFERENCES secciones_evaluacion_docente(id_seccion_evaluacion_docente)
);
-- Create Tables and Contraints
--REVISAR Y AJUSTAR SEGÚN NECESIDADES ESPECÍFICAS DEL PROYECTO

-- =============================================
-- 1. TABLAS PRINCIPALES
-- =============================================

-- Tabla de períodos académicos (3 lapsos)
CREATE TABLE periodos_academicos (
    id SERIAL PRIMARY KEY,
    año INTEGER NOT NULL,
    numero_lapso INTEGER CHECK (numero_lapso BETWEEN 1 AND 3),
    nombre VARCHAR(50) GENERATED ALWAYS AS (año || '-Lapso-' || numero_lapso) STORED,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_periodo CHECK (fecha_inicio < fecha_fin)
);

-- Tabla de docentes
CREATE TABLE docentes (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    fecha_ingreso DATE DEFAULT CURRENT_DATE
);

-- Tabla de asignaturas
CREATE TABLE asignaturas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    nivel_educativo VARCHAR(50) CHECK (nivel_educativo IN ('Media General', 'Educación Media', 'Educación Básica')),
    activa BOOLEAN DEFAULT true
);

-- =============================================
-- 2. TABLAS PARA ENCUESTA ESTUDIANTES (Escala 1-5)
-- =============================================

CREATE TABLE encuestas_estudiantes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    titulo VARCHAR(200) DEFAULT 'Evaluación de Profesores por los Estudiantes',
    periodo_id INTEGER REFERENCES periodos_academicos(id),
    asignatura_id INTEGER REFERENCES asignaturas(id),
    docente_evaluado_id INTEGER REFERENCES docentes(id),
    seccion VARCHAR(10),
    fecha_apertura DATE NOT NULL,
    fecha_cierre DATE NOT NULL,
    activa BOOLEAN DEFAULT true,
    link_acceso VARCHAR(500),
    CONSTRAINT chk_fechas_encuesta CHECK (fecha_apertura <= fecha_cierre)
);

-- Preguntas específicas para estudiantes (según imagen: 20 indicadores)
CREATE TABLE preguntas_estudiantes (
    id SERIAL PRIMARY KEY,
    encuesta_id INTEGER REFERENCES encuestas_estudiantes(id) ON DELETE CASCADE,
    numero_orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    categoria VARCHAR(100), -- Ej: 'Presentación', 'Puntualidad', 'Evaluación', 'Metodología'
    tipo_escala VARCHAR(20) DEFAULT 'LIKERT_5' CHECK (tipo_escala IN ('LIKERT_5')),
    CONSTRAINT unico_orden_encuesta UNIQUE (encuesta_id, numero_orden)
);

-- Respuestas de estudiantes (Escala 1-5 con decimales como en la imagen)
CREATE TABLE respuestas_estudiantes (
    id SERIAL PRIMARY KEY,
    encuesta_id INTEGER REFERENCES encuestas_estudiantes(id) ON DELETE CASCADE,
    pregunta_id INTEGER REFERENCES preguntas_estudiantes(id),
    valor DECIMAL(3,1) CHECK (valor >= 1 AND valor <= 5), -- Ej: 3.5, 4.8 como en la imagen
    estudiante_hash VARCHAR(100), -- Hash para anonimato pero control de único voto
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    CONSTRAINT unico_voto_pregunta UNIQUE (encuesta_id, pregunta_id, estudiante_hash)
);

-- =============================================
-- 3. TABLAS PARA EVALUACIÓN DOCENTE-DOCENTE (SET/SEP/NSE)
-- =============================================

CREATE TABLE evaluaciones_docente_docente (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    titulo VARCHAR(200) DEFAULT 'Acompañamiento del Desempeño Docente',
    periodo_id INTEGER REFERENCES periodos_academicos(id),
    docente_acompaniante_id INTEGER REFERENCES docentes(id),
    docente_acompaniado_id INTEGER REFERENCES docentes(id),
    asignatura_id INTEGER REFERENCES asignaturas(id),
    grado VARCHAR(20),
    seccion VARCHAR(10),
    fecha_evaluacion DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    observaciones TEXT,
    total_puntos DECIMAL(5,2),
    porcentaje_obtenido DECIMAL(5,2),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_docentes_diferentes CHECK (docente_acompaniante_id != docente_acompaniado_id)
);

-- Secciones del formulario docente (I, II, III partes)
CREATE TABLE secciones_evaluacion_docente (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL,
    UNIQUE(codigo)
);

-- Preguntas para evaluación docente-docente (SET/SEP/NSE)
CREATE TABLE preguntas_docentes (
    id SERIAL PRIMARY KEY,
    seccion_id INTEGER REFERENCES secciones_evaluacion_docente(id),
    numero_orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    descripcion TEXT, -- Para preguntas con sub-ítems
    valor_set DECIMAL(3,2) DEFAULT 1.00,
    valor_sep DECIMAL(3,2) DEFAULT 0.50,
    valor_nse DECIMAL(3,2) DEFAULT 0.00,
    fase_secuencia VARCHAR(50), -- 'Inicio', 'Desarrollo', 'Cierre' (solo para sección SD)
    UNIQUE(seccion_id, numero_orden)
);

-- Respuestas de evaluación docente-docente
CREATE TABLE respuestas_docentes (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER REFERENCES evaluaciones_docente_docente(id) ON DELETE CASCADE,
    pregunta_id INTEGER REFERENCES preguntas_docentes(id),
    valor_seleccionado VARCHAR(10) CHECK (valor_seleccionado IN ('SET', 'SEP', 'NSE')),
    valor_puntos DECIMAL(3,2), -- Calculado automáticamente: 1.00, 0.50, 0.00
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unica_respuesta UNIQUE (evaluacion_id, pregunta_id)
);

-- =============================================
-- 4. TABLAS DE RESULTADOS Y REPORTES
-- =============================================

-- Resultados agregados para estudiantes (para gráficas rápidas)
CREATE TABLE resultados_estudiantes (
    id SERIAL PRIMARY KEY,
    encuesta_id INTEGER REFERENCES encuestas_estudiantes(id),
    pregunta_id INTEGER REFERENCES preguntas_estudiantes(id),
    total_respuestas INTEGER DEFAULT 0,
    promedio DECIMAL(4,2),
    moda DECIMAL(3,1),
    distribucion JSONB, -- Ej: {"5": 10, "4.5": 5, "4": 8, ...}
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(encuesta_id, pregunta_id)
);

-- Resultados agregados para docentes
CREATE TABLE resultados_docentes (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER REFERENCES evaluaciones_docente_docente(id),
    seccion_id INTEGER REFERENCES secciones_evaluacion_docente(id),
    total_preguntas INTEGER,
    total_puntos DECIMAL(6,2),
    maximo_puntos DECIMAL(6,2),
    porcentaje DECIMAL(5,2),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evaluacion_id, seccion_id)
);
-- =============================================
-- INICIALIZACIÓN DE LA BASE DE DATOS DEL SISTEMA DE ENCUESTAS ESCOLARES
-- =============================================

-- 1. CONFIGURACIÓN DE ADMINISTRADOR
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    pin_code VARCHAR(50) NOT NULL
);

-- 2. TABLAS DE GESTIÓN ACADÉMICA

-- Periodos Académicos (ej., "2024-2025 Term 1")
CREATE TABLE IF NOT EXISTS academic_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- ej., "Año 2024 - Periodo 1"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dates CHECK (start_date < end_date)
);

-- Docentes
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    national_id VARCHAR(20) UNIQUE NOT NULL, -- Cédula
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asignaturas
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    educational_level VARCHAR(50) NOT NULL, -- 'Secundaria', 'Media'
    is_active BOOLEAN DEFAULT true
);

-- Asignaciones de Docentes (Quién enseña qué y cuándo)
-- Conecta un Docente a una Asignatura en un Periodo específico
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    period_id INTEGER NOT NULL,
    section_name VARCHAR(10), -- ej., "Sección A"
    
    CONSTRAINT fk_assignment_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    CONSTRAINT fk_assignment_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT fk_assignment_period FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    CONSTRAINT unique_assignment UNIQUE (teacher_id, subject_id, period_id, section_name)
);

-- 3. TABLAS PRINCIPALES DE ENCUESTAS

-- Encuestas (La definición de un formulario)
CREATE TABLE IF NOT EXISTS surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_audience VARCHAR(50) NOT NULL, -- 'ESTUDIANTE_A_DOCENTE', 'DOCENTE_A_DOCENTE'
    access_link VARCHAR(255) UNIQUE NOT NULL,
    expiration_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Opcional: Si una encuesta implica un contexto específico de asignatura/docente globalmente (modo simplificado)
    -- Pero idealmente, el contexto está en el Envío (Submission). 
    -- Mantenemos estos como nulos para compatibilidad con tu código actual
    evaluated_name VARCHAR(150), 
    subject VARCHAR(100), 
    created_by INTEGER
);

-- Preguntas asociadas con una Encuesta
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    survey_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'RATING_1_5', 'TEXT', 'MULTIPLE_CHOICE'
    order_index INTEGER NOT NULL,
    category VARCHAR(100), -- ej., 'Pedagogía', 'Puntualidad'
    help_text TEXT, -- Texto de ayuda opcional para la pregunta

    -- MIGRATION: 
    -- ALTER TABLE questions ADD COLUMN IF NOT EXISTS help_text TEXT;
    
    CONSTRAINT fk_question_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    CONSTRAINT unique_order_per_survey UNIQUE (survey_id, order_index)
);

-- 4. RESPUESTAS Y ENVÍOS

-- Un Envío representa a un usuario completando una encuesta
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    survey_id UUID NOT NULL,
    
    -- Enlaces contextuales para Informes Profesionales
    -- Cuando un estudiante envía, lo vinculamos a la Asignación Docente específica que está evaluando
    teacher_assignment_id INTEGER, 
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    general_comment TEXT,
    
    CONSTRAINT fk_submission_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_assignment FOREIGN KEY (teacher_assignment_id) REFERENCES teacher_assignments(id)
);

-- Respuestas Individuales a Preguntas
CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_value NUMERIC(5, 2), -- Valor numérico (ej., 5 estrellas)
    answer_text TEXT,           -- Valor de texto si es pregunta abierta
    
    CONSTRAINT fk_answer_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_answer_question FOREIGN KEY (question_id) REFERENCES questions(id)
);


-- 5. GESTIÓN DE USUARIOS (RBAC)
CREATE TABLE IF NOT EXISTS system_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Para MVP almacenamos texto plano o hash simple. Idealmente bcrypt.
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EDITOR')),
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuario Admin por defecto si no existe
INSERT INTO system_users (username, password_hash, role, full_name)
VALUES ('admin', 'admin123', 'ADMIN', 'Administrador Principal')
ON CONFLICT (username) DO NOTHING;

-- 6. DATOS SEMILLA INICIALES (Opcional - PIN de Admin)
INSERT INTO admin_settings (pin_code) VALUES ('12345') ON CONFLICT DO NOTHING;

-- 7. Crear Usuario Editor (Solo gestión de encuestas propias)
INSERT INTO system_users (username, password_hash, role, full_name)
VALUES ('editor', 'editor123', 'EDITOR', 'Editor de Encuestas')
ON CONFLICT (username) DO NOTHING;

-- 8. Sessiones activas
CREATE TABLE IF NOT EXISTS active_survey_sessions (
    id SERIAL PRIMARY KEY,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    session_token UUID NOT NULL UNIQUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
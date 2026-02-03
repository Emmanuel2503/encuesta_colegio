-- =============================================
-- SCHOOL SURVEY SYSTEM DATABASE INITIALIZATION
-- =============================================

-- 1. ADMIN SETTINGS
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    pin_code VARCHAR(50) NOT NULL
);

-- 2. ACADEMIC MANAGEMENT TABLES

-- Academic Periods (e.g., "2024-2025 Term 1")
CREATE TABLE IF NOT EXISTS academic_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., "Year 2024 - Term 1"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dates CHECK (start_date < end_date)
);

-- Teachers / Docentes
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    national_id VARCHAR(20) UNIQUE NOT NULL, -- Cedula
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects / Asignaturas
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    educational_level VARCHAR(50) NOT NULL, -- 'High School', 'Middle School'
    is_active BOOLEAN DEFAULT true
);

-- Teacher Assignments (Who teaches what and when)
-- Connects a Teacher to a Subject in a specific Period
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    period_id INTEGER NOT NULL,
    section_name VARCHAR(10), -- e.g., "Section A"
    
    CONSTRAINT fk_assignment_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    CONSTRAINT fk_assignment_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT fk_assignment_period FOREIGN KEY (period_id) REFERENCES academic_periods(id),
    CONSTRAINT unique_assignment UNIQUE (teacher_id, subject_id, period_id, section_name)
);

-- 3. SURVEY CORE TABLES

-- Surveys (The definition of a form)
CREATE TABLE IF NOT EXISTS surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_audience VARCHAR(50) NOT NULL, -- 'STUDENT_TO_TEACHER', 'TEACHER_TO_TEACHER'
    access_link VARCHAR(255) UNIQUE NOT NULL,
    expiration_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Optional: If a survey implies a specific subject/teacher context globally (simplified mode)
    -- But ideally, the context is in the Submission. 
    -- We keep these nullable for backward compatibility with your current code
    evaluated_name VARCHAR(150), 
    subject VARCHAR(100) 
);

-- Questions associated with a Survey
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    survey_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'RATING_1_5', 'TEXT', 'MULTIPLE_CHOICE'
    order_index INTEGER NOT NULL,
    category VARCHAR(100), -- e.g., 'Pedagogy', 'Punctuality'
    
    CONSTRAINT fk_question_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    CONSTRAINT unique_order_per_survey UNIQUE (survey_id, order_index)
);

-- 4. RESPONSES & SUBMISSIONS

-- A Submission represents one user filling out one survey
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    survey_id UUID NOT NULL,
    
    -- Contextual links for Professional Reporting
    -- When a student submits, we link it to the specific Teacher Assignment being evaluated
    teacher_assignment_id INTEGER, 
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    general_comment TEXT,
    
    CONSTRAINT fk_submission_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_assignment FOREIGN KEY (teacher_assignment_id) REFERENCES teacher_assignments(id)
);

-- Individual Answers to Questions
CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_value NUMERIC(5, 2), -- Numeric value (e.g., 5 stars)
    answer_text TEXT,           -- Text value if open question
    
    CONSTRAINT fk_answer_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_answer_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 5. INITIAL SEED DATA (Optional - Admin PIN)
INSERT INTO admin_settings (pin_code) VALUES ('1234') ON CONFLICT DO NOTHING;

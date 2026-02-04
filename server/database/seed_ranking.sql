-- =============================================
-- SCRIPT DE DATOS DE PRUEBA: RANKING DOCENTE
-- Ejecutar en pgAdmin o psql para probar el ranking
-- =============================================

TRUNCATE TABLE 
    answers, submissions, questions, surveys, 
    teacher_assignments, subjects, teachers, academic_periods 
    RESTART IDENTITY CASCADE;

INSERT INTO admin_settings (pin_code) VALUES ('12345') ON CONFLICT DO NOTHING;	

DO $$
DECLARE
    v_period_id INTEGER;
    
    -- Variables para el profesor "Normal"
    v_teacher_id INTEGER;
    v_subject_id INTEGER;
    v_assign_id INTEGER;
    v_survey_id UUID;
    v_q1 INTEGER; v_q2 INTEGER; v_q3 INTEGER;
    v_submission_id INTEGER;
    
    -- Variables para el profesor "Multifacético" (Caso especial)
    v_multi_teacher_id INTEGER;
    v_subj_good_id INTEGER;
    v_subj_bad_id INTEGER;
    v_assign_good_id INTEGER;
    v_assign_bad_id INTEGER;
    v_survey_good_id UUID;
    v_survey_bad_id UUID;

    rec jsonb;
    i INTEGER;
    random_score NUMERIC;
    
    -- Profesores de relleno (Simple 1 materia)
    teacher_data jsonb := '[
        {"name": "Alberto", "last": "Einstein", "materia": "Física", "target": 4.9},
        {"name": "Dolores", "last": "Umbridge", "materia": "Defensa", "target": 1.5}
    ]';
BEGIN
    RAISE NOTICE '🚀 Generando datos con caso Multi-Materia...';

    -- 2. PERIODO
    INSERT INTO academic_periods (name, start_date, end_date, is_active)
    VALUES ('Lapso 2025-I', NOW(), NOW() + INTERVAL '6 months', true)
    RETURNING id INTO v_period_id;

    -- ============================================================
    -- PASO A: GENERAR PROFESORES SIMPLES (RELLENO)
    -- ============================================================
    FOR rec IN SELECT * FROM jsonb_array_elements(teacher_data) LOOP
        -- (Misma lógica anterior resumida para no hacer largo el script)
        INSERT INTO teachers (national_id, first_name, last_name, email)
        VALUES ('V-'||floor(random()*1000)::text, rec->>'name', rec->>'last', lower(rec->>'name')||'@test.com') RETURNING id INTO v_teacher_id;
        
        INSERT INTO subjects (code, name, educational_level) VALUES (substring(md5(random()::text),1,5), rec->>'materia', 'Media') RETURNING id INTO v_subject_id;
        
        INSERT INTO teacher_assignments (teacher_id, subject_id, period_id, section_name) VALUES (v_teacher_id, v_subject_id, v_period_id, 'A') RETURNING id INTO v_assign_id;
        
        INSERT INTO surveys (title, description, target_audience, access_link, expiration_date, evaluated_name, subject)
        VALUES ('Eval '||(rec->>'last'), 'Desc', 'ESTUDIANTE_A_DOCENTE', 'link-'||(rec->>'last'), NOW()+'1 month', (rec->>'name')||' '||(rec->>'last'), rec->>'materia') RETURNING id INTO v_survey_id;
        
        -- Preguntas
        INSERT INTO questions (survey_id, question_text, question_type, order_index) VALUES (v_survey_id, 'Pregunta General', 'ESCALA_1_5', 1) RETURNING id INTO v_q1;
        
        -- Respuestas
        FOR i IN 1..40 LOOP
            INSERT INTO submissions (survey_id, teacher_assignment_id) VALUES (v_survey_id, v_assign_id) RETURNING id INTO v_submission_id;
            random_score := (rec->>'target')::numeric + (random() - 0.5);
            IF random_score > 5 THEN random_score := 5; END IF; IF random_score < 1 THEN random_score := 1; END IF;
            INSERT INTO answers (submission_id, question_id, answer_value) VALUES (v_submission_id, v_q1, round(random_score));
        END LOOP;
    END LOOP;

    -- ============================================================
    -- PASO B: EL CASO "RICARDO DOBLE CARA" (EL IMPORTANTE)
    -- ============================================================
    
    -- 1. Crear al Profesor
    INSERT INTO teachers (national_id, first_name, last_name, email)
    VALUES ('V-99999', 'Ricardo', 'Multifacetico', 'ricardo@test.com') 
    RETURNING id INTO v_multi_teacher_id;

    -- 2. Crear DOS Materias Distintas
    INSERT INTO subjects (code, name, educational_level) VALUES ('MAT-ADV', 'Matemáticas Avanzadas', 'Media') RETURNING id INTO v_subj_good_id;
    INSERT INTO subjects (code, name, educational_level) VALUES ('HIS-BASIC', 'Historia Básica', 'Media') RETURNING id INTO v_subj_bad_id;

    -- 3. Asignar AMBAS al mismo profesor
    INSERT INTO teacher_assignments (teacher_id, subject_id, period_id, section_name) VALUES (v_multi_teacher_id, v_subj_good_id, v_period_id, 'A') RETURNING id INTO v_assign_good_id;
    INSERT INTO teacher_assignments (teacher_id, subject_id, period_id, section_name) VALUES (v_multi_teacher_id, v_subj_bad_id, v_period_id, 'B') RETURNING id INTO v_assign_bad_id;

    -- ------------------------------------------------------------
    -- ESCENARIO 1: MATEMÁTICAS (LO HACE EXCELENTE -> TARGET 4.8)
    -- ------------------------------------------------------------
    INSERT INTO surveys (title, description, target_audience, access_link, expiration_date, evaluated_name, subject)
    VALUES ('Eval Matemáticas', 'Evalua al Prof Ricardo en Math', 'ESTUDIANTE_A_DOCENTE', 'ricardo-math', NOW()+'1 month', 'Ricardo Multifacetico', 'Matemáticas Avanzadas') RETURNING id INTO v_survey_good_id;

    INSERT INTO questions (survey_id, question_text, question_type, order_index) VALUES (v_survey_good_id, 'Dominio de Matemáticas', 'ESCALA_1_5', 1) RETURNING id INTO v_q1;

    -- Generar 50 respuestas MUY BUENAS (4 o 5)
    FOR i IN 1..50 LOOP
        INSERT INTO submissions (survey_id, teacher_assignment_id) VALUES (v_survey_good_id, v_assign_good_id) RETURNING id INTO v_submission_id;
        INSERT INTO answers (submission_id, question_id, answer_value) VALUES (v_submission_id, v_q1, floor(random()*2 + 4)); -- Genera 4 o 5
    END LOOP;

    -- ------------------------------------------------------------
    -- ESCENARIO 2: HISTORIA (LO HACE MAL -> TARGET 2.0)
    -- ------------------------------------------------------------
    INSERT INTO surveys (title, description, target_audience, access_link, expiration_date, evaluated_name, subject)
    VALUES ('Eval Historia', 'Evalua al Prof Ricardo en Historia', 'ESTUDIANTE_A_DOCENTE', 'ricardo-hist', NOW()+'1 month', 'Ricardo Multifacetico', 'Historia Básica') RETURNING id INTO v_survey_bad_id;

    INSERT INTO questions (survey_id, question_text, question_type, order_index) VALUES (v_survey_bad_id, 'Dominio de Historia', 'ESCALA_1_5', 1) RETURNING id INTO v_q1; -- Reusamos variable v_q1 para nueva ID

    -- Generar 50 respuestas MUY MALAS (1 o 2)
    FOR i IN 1..50 LOOP
        INSERT INTO submissions (survey_id, teacher_assignment_id) VALUES (v_survey_bad_id, v_assign_bad_id) RETURNING id INTO v_submission_id;
        INSERT INTO answers (submission_id, question_id, answer_value) VALUES (v_submission_id, v_q1, floor(random()*2 + 1)); -- Genera 1 o 2
    END LOOP;

    RAISE NOTICE 'Datos generados. Busca a Ricardo Multifacetico en el ranking.';
END $$;
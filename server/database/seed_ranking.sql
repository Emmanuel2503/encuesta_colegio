-- =============================================
-- SCRIPT DE DATOS DE PRUEBA: RANKING DOCENTE
-- Ejecutar en pgAdmin o psql para poblar el ranking
-- =============================================

DO $$
DECLARE
    -- Variables para IDs
    v_teacher_id INTEGER;
    v_subject_id INTEGER;
    v_period_id INTEGER;
    v_assignment_id INTEGER;
    v_survey_id UUID;
    v_question_ids INTEGER[];
    v_submission_id INTEGER;
    v_question_text TEXT;
    
    -- Configuración de Profesores (Nombre, Apellido, Puntaje Objetivo)
    -- Target Score: Promedio hacia donde se inclinarán los votos aleatorios
    teachers_array jsonb := '[
        {"first": "Ana", "last": "García", "target": 4.8},
        {"first": "Carlos", "last": "Pérez", "target": 4.2},
        {"first": "María", "last": "Rodríguez", "target": 3.5},
        {"first": "Juan", "last": "López", "target": 2.8},
        {"first": "Laura", "last": "Martínez", "target": 4.0}
    ]';
    
    subjects_array text[] := ARRAY['Matemáticas', 'Historia', 'Ciencias', 'Literatura', 'Arte'];
    
    -- Variables de bucle
    i INTEGER;
    j INTEGER;
    k INTEGER;
    num_submissions INTEGER;
    v_score NUMERIC;
    
    -- Función para generar UUID random (si pgcrypto no existe, usamos gen_random_uuid nativo de PG 13+)
BEGIN
    RAISE NOTICE '🌱 Iniciando generación de datos para Ranking...';

    -- 1. Asegurar Periodo Activo
    SELECT id INTO v_period_id FROM academic_periods WHERE is_active = true LIMIT 1;
    IF v_period_id IS NULL THEN
        INSERT INTO academic_periods (name, start_date, end_date, is_active) 
        VALUES ('2025-2026', NOW(), NOW() + INTERVAL '1 year', true) 
        RETURNING id INTO v_period_id;
    END IF;

    -- Bucle por cada profesor configurado
    FOR i IN 0..jsonb_array_length(teachers_array) - 1 LOOP
        
        -- 2. Insertar Profesor
        INSERT INTO teachers (national_id, first_name, last_name, email)
        VALUES (
            'ID-' || substring(md5(random()::text), 1, 8), 
            teachers_array->i->>'first', 
            teachers_array->i->>'last', 
            lower(teachers_array->i->>'first') || '@simulado.com'
        ) RETURNING id INTO v_teacher_id;

        -- 3. Insertar Materia
        INSERT INTO subjects (name, code, educational_level)
        VALUES (subjects_array[i+1], 'SUB-' || substring(md5(random()::text), 1, 4), 'Media General')
        RETURNING id INTO v_subject_id;

        -- 4. Asignar Materia a Profesor
        INSERT INTO teacher_assignments (teacher_id, subject_id, period_id, section_name) 
        VALUES (v_teacher_id, v_subject_id, v_period_id, 'A') 
        RETURNING id INTO v_assignment_id;

        -- 5. Crear Encuesta para esa Asignación
        INSERT INTO surveys (title, description, target_audience, evaluated_name, subject, access_link, expiration_date)
        VALUES (
            'Evaluación: ' || (teachers_array->i->>'last'), 
            'Encuesta generada automáticamente para pruebas de ranking', 
            'ESTUDIANTE_A_DOCENTE', 
            (teachers_array->i->>'first') || ' ' || (teachers_array->i->>'last'), 
            subjects_array[i+1], 
            substring(md5(random()::text), 1, 8), -- Link random
            NOW() + INTERVAL '1 month'
        ) RETURNING id INTO v_survey_id;

        -- 6. Insertar Preguntas (4 fijas)
        v_question_ids := ARRAY[]::INTEGER[];
        
        INSERT INTO questions (survey_id, question_text, question_type, order_index, category, help_text) 
        VALUES (v_survey_id, '¿El docente explica con claridad?', 'ESCALA_1_5', 1, 'General', 'Claridad de conceptos') RETURNING id INTO v_question_ids[1];
        
        INSERT INTO questions (survey_id, question_text, question_type, order_index, category, help_text) 
        VALUES (v_survey_id, '¿Asiste puntualmente a clases?', 'ESCALA_1_5', 2, 'General', 'Puntualidad') RETURNING id INTO v_question_ids[2];
        
        INSERT INTO questions (survey_id, question_text, question_type, order_index, category, help_text) 
        VALUES (v_survey_id, '¿Fomenta la participación?', 'ESCALA_1_5', 3, 'General', NULL) RETURNING id INTO v_question_ids[3];
        
        INSERT INTO questions (survey_id, question_text, question_type, order_index, category, help_text) 
        VALUES (v_survey_id, '¿Es respetuoso con los alumnos?', 'ESCALA_1_5', 4, 'General', 'Trato respetuoso') RETURNING id INTO v_question_ids[4];

        -- 7. Generar Respuestas Simuladas (Entre 20 y 50)
        num_submissions := floor(random() * 30 + 20)::int;
        RAISE NOTICE '   > Generando % respuestas para % % (Target: %)', num_submissions, teachers_array->i->>'first', teachers_array->i->>'last', teachers_array->i->>'target';

        FOR k IN 1..num_submissions LOOP
            -- Crear Submission
            INSERT INTO submissions (survey_id, teacher_assignment_id) 
            VALUES (v_survey_id, v_assignment_id) 
            RETURNING id INTO v_submission_id;

            -- Crear Answers para cada pregunta
            FOREACH j IN ARRAY v_question_ids LOOP
                 -- Lógica simple para simular promedio: Target +/- aleatorio
                 -- Generamos un número normal alrededor del target (aproximado)
                 v_score := (teachers_array->i->>'target')::numeric + (random() * 2 - 1); -- Target +/- 1
                 
                 -- Clamp entre 1 y 5
                 IF v_score > 5 THEN v_score := 5; END IF;
                 IF v_score < 1 THEN v_score := 1; END IF;
                 
                 -- Redondear a .0 o .5 para que se vea más real o entero
                 v_score := round(v_score);

                INSERT INTO answers (submission_id, question_id, answer_value) 
                VALUES (v_submission_id, j, v_score);
            END LOOP;
        END LOOP;
        
    END LOOP;

    RAISE NOTICE '✅ ¡Datos de Ranking generados exitosamente!';
END $$;

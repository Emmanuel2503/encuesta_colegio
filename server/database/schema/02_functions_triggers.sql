--FUNCTIONS and TRIGGERS
-- Revisar las funciones y triggers creados en la base de datos.
-- Crear otras funciones y triggers sí es necesario.

-- Función para calcular porcentaje docente según tabla de imagen
CREATE OR REPLACE FUNCTION calcular_porcentaje_docente(total_puntos DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN total_puntos BETWEEN 40 AND 46 THEN 100.00
        WHEN total_puntos BETWEEN 30 AND 39 THEN 75.00
        WHEN total_puntos BETWEEN 20 AND 29 THEN 50.00
        WHEN total_puntos BETWEEN 10 AND 19 THEN 25.00
        ELSE 0.00
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular puntos automáticamente en respuestas_docentes
CREATE OR REPLACE FUNCTION calcular_puntos_respuesta_docente()
RETURNS TRIGGER AS $$
BEGIN
    NEW.valor_puntos := CASE NEW.valor_seleccionado
        WHEN 'SET' THEN 1.00
        WHEN 'SEP' THEN 0.50
        WHEN 'NSE' THEN 0.00
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calcular_puntos_docente
BEFORE INSERT OR UPDATE ON respuestas_docentes
FOR EACH ROW
EXECUTE FUNCTION calcular_puntos_respuesta_docente();

-- Trigger para actualizar total en evaluación docente-docente
CREATE OR REPLACE FUNCTION actualizar_total_evaluacion_docente()
RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL;
    v_evaluacion_id INTEGER;
BEGIN
    v_evaluacion_id := CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.evaluacion_id 
        ELSE NEW.evaluacion_id 
    END;
    
    SELECT COALESCE(SUM(valor_puntos), 0) INTO v_total
    FROM respuestas_docentes
    WHERE evaluacion_id = v_evaluacion_id;
    
    UPDATE evaluaciones_docente_docente
    SET total_puntos = v_total,
        porcentaje_obtenido = calcular_porcentaje_docente(v_total)
    WHERE id = v_evaluacion_id;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_actualizar_total_docente
AFTER INSERT OR UPDATE OR DELETE ON respuestas_docentes
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_evaluacion_docente();

-- Trigger para actualizar resultados agregados de estudiantes
CREATE OR REPLACE FUNCTION actualizar_resultados_estudiantes()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar resultados agregados para la pregunta
    INSERT INTO resultados_estudiantes (encuesta_id, pregunta_id, total_respuestas, promedio)
    SELECT 
        re.encuesta_id,
        re.pregunta_id,
        COUNT(*) as total_respuestas,
        AVG(re.valor) as promedio
    FROM respuestas_estudiantes re
    WHERE re.encuesta_id = NEW.encuesta_id AND re.pregunta_id = NEW.pregunta_id
    GROUP BY re.encuesta_id, re.pregunta_id
    ON CONFLICT (encuesta_id, pregunta_id) 
    DO UPDATE SET
        total_respuestas = EXCLUDED.total_respuestas,
        promedio = EXCLUDED.promedio,
        fecha_actualizacion = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_actualizar_resultados_estudiantes
AFTER INSERT OR UPDATE ON respuestas_estudiantes
FOR EACH ROW
EXECUTE FUNCTION actualizar_resultados_estudiantes();
-- =============================================
-- DATOS SEMILLA (SEED DATA) PARA EL SISTEMA DE ENCUESTAS ESCOLARES
-- =============================================

-- 1. Crear un Período Académico activo
INSERT INTO academic_periods (name, start_date, end_date, is_active)
VALUES ('Año 2024-2025 Lapso 1', '2024-09-01', '2024-12-15', true);

-- 2. Insertar Docentes
INSERT INTO teachers (national_id, first_name, last_name, email) VALUES
('V-12345678', 'Juan', 'Pérez', 'juan.perez@school.edu'),
('V-87654321', 'Maria', 'González', 'maria.gonzalez@school.edu'),
('V-11223344', 'Carlos', 'Rodríguez', 'carlos.rodriguez@school.edu');

-- 3. Insertar Materias
INSERT INTO subjects (code, name, educational_level) VALUES
('MATH101', 'Matemáticas 1er Año', 'Educación Media'),
('HIST101', 'Historia Universal', 'Educación Media'),
('BIO201', 'Biología', 'Educación Media');

-- 4. Asignaciones de Docentes (Vincular Docentes a Materias en el Período Activo)
-- Necesitamos los IDs, así que usaremos subconsultas o asumiremos que los IDs 1, 2, 3 dependen de una instalación limpia
-- Por seguridad, usamos inserciones simples asumiendo que la secuencia comienza en 1
INSERT INTO teacher_assignments (teacher_id, subject_id, period_id, section_name)
VALUES 
(1, 1, 1, 'A'), -- Juan Pérez enseña Matemáticas 101 a la Sección A
(1, 1, 1, 'B'), -- Juan Pérez enseña Matemáticas 101 a la Sección B
(2, 2, 1, 'A'), -- Maria enseña Historia
(3, 3, 1, 'A'); -- Carlos enseña Biología

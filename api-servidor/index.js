const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(cors());
app.use(express.json());

// --- PROFESSIONAL SCHEMA ENDPOINTS (SCHOOL MANAGEMENT) ---

// 1. Get Teachers
app.get("/api/setup/teachers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM teachers ORDER BY last_name",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching teachers" });
  }
});

// 2. Create Teacher
app.post("/api/setup/teachers", async (req, res) => {
  try {
    const { national_id, first_name, last_name, email } = req.body;
    const result = await pool.query(
      "INSERT INTO teachers (national_id, first_name, last_name, email) VALUES ($1, $2, $3, $4) RETURNING *",
      [national_id, first_name, last_name, email],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating teacher" });
  }
});

// 3. Get Subjects
app.get("/api/setup/subjects", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM subjects ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching subjects" });
  }
});

// 4. Get Active Assignments (To populate dropdowns)
app.get("/api/setup/assignments", async (req, res) => {
  try {
    // Returns detailed info: "Math 101 - Section A (Prof. Perez)"
    const query = `
      SELECT ta.id, s.name as subject_name, t.last_name, t.first_name, ta.section_name
      FROM teacher_assignments ta
      JOIN teachers t ON ta.teacher_id = t.id
      JOIN subjects s ON ta.subject_id = s.id
      JOIN academic_periods ap ON ta.period_id = ap.id
      WHERE ap.is_active = true
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching assignments" });
  }
});

// --- SURVEY MANAGEMENT (CORE) ---

// 1. Crear Encuesta (Admin)
app.post("/api/surveys", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      title,
      description,
      target_audience,
      evaluated_name,
      national_id,
      subject,
      expiration_date,
      questions,
      teacher_assignment_id,
      userId, // Extract userId from request
    } = req.body;

    if (!title || title.trim() === '') return res.status(400).json({ error: "El título es obligatorio." });
    if (!evaluated_name || evaluated_name.trim() === '') return res.status(400).json({ error: "El nombre del evaluado es obligatorio." });
    if (target_audience === "ESTUDIANTE_A_DOCENTE" && (!subject || subject.trim() === '')) return res.status(400).json({ error: "La materia es obligatoria." });
    if (!questions || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: "Debe haber al menos 1 pregunta." });
    if (national_id && !/^\d+$/.test(national_id.toString().trim())) return res.status(400).json({ error: "La cédula debe contener solo números positivos." });

    const access_link = uuidv4();

    await client.query("BEGIN");

    // 1. Insert Header
    // We allow explicit text values for evaluated_name/subject even if using professional schema
    // This supports "Hybrid Mode" (Manual text entry OR Professional ID)
    const surveyRes = await client.query(
      `INSERT INTO surveys (title, description, target_audience, evaluated_name, national_id, subject, access_link, expiration_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        title,
        description,
        target_audience,
        evaluated_name,
        national_id,
        subject,
        access_link,
        expiration_date,
        userId || null, // Guardar el creador
      ],
    );
    const surveyId = surveyRes.rows[0].id;

    // 2. Insert Questions
    const questionQuery = `
      INSERT INTO questions (survey_id, question_text, question_type, order_index, category, help_text, scale_labels)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const scaleLabels = q.scale_labels && Object.keys(q.scale_labels).some(k => q.scale_labels[k]?.trim())
        ? JSON.stringify(q.scale_labels)
        : null;
      await client.query(questionQuery, [
        surveyId,
        q.text,
        q.type,
        i,
        q.category || null,
        q.help_text || null,
        scaleLabels,
      ]);
    }

    await client.query("COMMIT");
    res
      .status(201)
      .json({ message: "Creada", link: access_link, id: surveyId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error interno al crear encuesta" });
  } finally {
    client.release();
  }
});

// 1. LOGIN ADMIN (RBAC: USER/PASSWORD)
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscar usuario en la base de datos
    const userRes = await pool.query(
      "SELECT id, username, password_hash, role, full_name, permissions FROM system_users WHERE username = $1",
      [username],
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Usuario o contraseña inválidos" });
    }

    const user = userRes.rows[0];

    // Comparar contraseña (TEXTO PLANO para MVP, idealmente usar bcrypt)
    if (user.password_hash !== password) {
      return res.status(401).json({ error: "Usuario o contraseña inválidos" });
    }

    // Login Exitoso
    res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        full_name: user.full_name,
        username: user.username,
        permissions: user.permissions || {},
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// --- PUBLIC ROUTES ---

// 3. OBTENER ENCUESTA POR LINK
app.get("/api/public/surveys/:link", async (req, res) => {
  console.log("🚀 Entró al enpoint con link:", req.params.link);
  try {
    const { link } = req.params;

    // a. Buscar encuesta
    /*const surveyRes = await pool.query(
      `SELECT * FROM surveys WHERE access_link = $1`,
      [link],
    );*/
    const surveyRes = await pool.query(
      `SELECT *, (expiration_date < NOW()) as is_expired FROM surveys WHERE access_link = $1`,
      [link],
    );

    if (surveyRes.rows.length === 0) {
      console.log("No se encontró la encuesta ❌");
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }

    const survey = surveyRes.rows[0];
    console.log("✅ Encuesta encontrada: ", survey.id, survey.title);
    console.log(
      "📅 expiration_date:",
      survey.expiration_date,
      "tipo:",
      typeof survey.expiration_date,
    );
    console.log("🔘 is_active:", survey.is_active); // si existe

    // b. Validar Expiración
    if (survey.is_expired) {
      console.log("⏰ La encuesta ha expirado según la BD");
      return res
        .status(404)
        .json({ error: "Esta encuesta ha finalizado", expired: true });
    }

    // c. Buscar preguntas
    const questionsRes = await pool.query(
      "SELECT * FROM questions WHERE survey_id = $1 ORDER BY order_index",
      [survey.id],
    );
    console.log("📋 preguntas:", questionsRes.rows.length);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.json({ ...survey, questions: questionsRes.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 4. GUARDAR RESPUESTAS (SUBMIT)
app.post("/api/public/submit", async (req, res) => {
  const client = await pool.connect();
  console.log("📦 req.body recibido:", req.body);
  try {
    const {
      survey_id,
      answers,
      general_comment,
      teacher_assignment_id,
      sessionToken,
    } = req.body;

    await client.query("BEGIN");

    const subRes = await client.query(
      `INSERT INTO submissions (survey_id, general_comment, teacher_assignment_id) VALUES ($1, $2, $3) RETURNING id`,
      [survey_id, general_comment || null, teacher_assignment_id || null],
    );
    const submissionId = subRes.rows[0].id;

    const answerQuery = `
      INSERT INTO answers (submission_id, question_id, answer_value, answer_text)
      VALUES ($1, $2, $3, $4)
    `;
    for (const ans of answers) {
      const val =
        ans.value !== null && ans.value !== undefined && ans.value !== ""
          ? parseFloat(ans.value)
          : null;
      const txt = ans.text || null;
      await client.query(answerQuery, [
        submissionId,
        ans.question_id,
        val,
        txt,
      ]);
    }

    await client.query("COMMIT");

    // Eliminar la sesión activa si existe
    if (sessionToken) {
      await pool.query(
        "DELETE FROM active_survey_sessions WHERE session_token = $1",
        [sessionToken],
      );
    }

    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al guardar respuestas" });
  } finally {
    client.release();
  }
});
/*app.post("/api/public/submit", async (req, res) => {
  const client = await pool.connect();
  try {
    // Now receiving teacher_assignment_id if available form frontend
    const { survey_id, answers, general_comment, teacher_assignment_id } =
      req.body;

    await client.query("BEGIN");

    // a. Create Submission
    const subRes = await client.query(
      `INSERT INTO submissions (survey_id, general_comment, teacher_assignment_id) VALUES ($1, $2, $3) RETURNING id`,
      [survey_id, general_comment || null, teacher_assignment_id || null],
    );
    const submissionId = subRes.rows[0].id;

    // b. Save Answers
    const answerQuery = `
      INSERT INTO answers (submission_id, question_id, answer_value, answer_text)
      VALUES ($1, $2, $3, $4)
    `;

    for (const ans of answers) {
      const val =
        ans.value !== null && ans.value !== undefined && ans.value !== ""
          ? parseFloat(ans.value)
          : null;
      const txt = ans.text || null;

      await client.query(answerQuery, [
        submissionId,
        ans.question_id,
        val,
        txt,
      ]);
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al guardar respuestas" });
  } finally {
    client.release();
  }
});*/

// 5. OBTENER LISTA DE ENCUESTAS (Admin)
app.get("/api/admin/surveys", async (req, res) => {
  try {
    const text = `
      SELECT s.*, COUNT(sub.id) as response_count, s.created_by
      FROM surveys s 
      LEFT JOIN submissions sub ON s.id = sub.survey_id 
      GROUP BY s.id 
      ORDER BY s.created_at DESC
    `;
    const result = await pool.query(text);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener lista" });
  }
});

// 6. OBTENER RESULTADOS DETALLADOS (Resultados)
app.get("/api/admin/surveys/:id/results", async (req, res) => {
  try {
    const { id } = req.params;

    // a. Encuesta
    const surveyRes = await pool.query("SELECT * FROM surveys WHERE id = $1", [
      id,
    ]);
    if (surveyRes.rows.length === 0)
      return res.status(404).json({ error: "No encontrada" });
    const survey = surveyRes.rows[0];

    // b. Preguntas
    const questionsRes = await pool.query(
      "SELECT * FROM questions WHERE survey_id = $1 ORDER BY order_index",
      [id],
    );
    const questions = questionsRes.rows;

    // c. Estadísticas
    const statsQuery = `
      SELECT q.id as question_id, a.answer_value, a.answer_text, COUNT(*) as count
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE q.survey_id = $1
      GROUP BY q.id, a.answer_value, a.answer_text
    `;
    const statsRes = await pool.query(statsQuery, [id]);

    // Procesar datos para gráficos
    const detailedQuestions = questions.map((q) => {
      const relevantStats = statsRes.rows.filter((s) => s.question_id === q.id);
      let chartData = [];

      // Lógica para ESTRELLAS (1-5)
      if (q.question_type === "ESCALA_1_5") {
        chartData = [1, 2, 3, 4, 5].map((star) => {
          const found = relevantStats.find(
            (s) => parseFloat(s.answer_value) === star,
          );
          return {
            name: `${star}⭐`,
            value: found ? parseInt(found.count) : 0,
          };
        });
      } else if (q.question_type === "ESCALA_DOCENTE") {
        chartData = [
          { val: 1, label: "SET (1)" },
          { val: 0.5, label: "SEP (0.5)" },
          { val: 0, label: "NSE (0)" },
        ].map((opt) => {
          const found = relevantStats.find(
            (s) => parseFloat(s.answer_value) === opt.val,
          );
          return { name: opt.label, value: found ? parseInt(found.count) : 0 };
        });
      } else if (q.question_type === "SELECCION_MULTIPLE") {
        chartData = relevantStats.map((s) => ({
          name: s.answer_text,
          value: parseInt(s.count),
        }));
      } else if (q.question_type === "TEXTO") {
        chartData = relevantStats
          .filter((s) => s.answer_text && s.answer_text.trim() !== '')
          .map((s) => ({
            text: s.answer_text,
            count: parseInt(s.count),
          }));
      }

      return { ...q, data: chartData };
    });

    // d. Comentarios Generales
    const commentsRes = await pool.query(
      "SELECT general_comment FROM submissions WHERE survey_id = $1 AND general_comment IS NOT NULL AND general_comment != ''",
      [id],
    );
    const comments = commentsRes.rows.map((row) => row.general_comment);

    res.json({ ...survey, questions_analysis: detailedQuestions, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error analizando resultados" });
  }
});

// 7. ELIMINAR ENCUESTA (CON RBAC)
app.delete("/api/surveys/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { userId, userRole } = req.body; // Recibimos credenciales del solicitante

    // a. Verificar Permisos
    const surveyCheck = await client.query(
      "SELECT created_by FROM surveys WHERE id = $1",
      [id],
    );

    if (surveyCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }

    const survey = surveyCheck.rows[0];

    // Lógica RBAC Estricta
    let canDelete = false;

    if (userRole === "ADMIN") {
      canDelete = true; // Admin borra todo
    } else if (userRole === "EDITOR") {
      // Editor solo borra lo suyo
      // Nota: survey.created_by podría ser null si es vieja, en ese caso solo admin borra.
      if (
        survey.created_by &&
        survey.created_by.toString() === userId.toString()
      ) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      client.release();
      return res
        .status(403)
        .json({ error: "No tienes permiso para borrar esta encuesta." });
    }

    await client.query("BEGIN");

    // b. Eliminar dependencias
    await client.query(
      `
      DELETE FROM answers 
      WHERE submission_id IN (SELECT id FROM submissions WHERE survey_id = $1)
    `,
      [id],
    );

    await client.query("DELETE FROM submissions WHERE survey_id = $1", [id]);
    await client.query("DELETE FROM questions WHERE survey_id = $1", [id]);

    // c. Eliminar la encuesta
    await client.query("DELETE FROM surveys WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Encuesta eliminada correctamente" });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al eliminar" });
  } finally {
    if (client) client.release();
  }
});

// 8. REINICIAR RESULTADOS
app.delete("/api/surveys/:id/reset", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM submissions WHERE survey_id = $1", [id]);
    res.json({ message: "Resultados reiniciados a cero." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al reiniciar resultados" });
  }
});

// 9. REPORTE DE RANKING DOCENTE
app.get("/api/reports/teachers-ranking", async (req, res) => {
  try {
    const query = `
      SELECT 
        MAX(s.evaluated_name) as full_name,  -- Display the "prettiest" version found
        LOWER(TRIM(s.national_id)) as teacher_id, -- Use lower case cedula as ID for routing
        ROUND(AVG(a.answer_value), 2) as average_score,
        COUNT(DISTINCT s.id) as total_surveys
      FROM surveys s
      JOIN submissions sub ON s.id = sub.survey_id
      JOIN answers a ON sub.id = a.submission_id
      WHERE a.answer_value IS NOT NULL AND s.national_id IS NOT NULL AND s.national_id != ''
      GROUP BY LOWER(TRIM(s.national_id))
      ORDER BY average_score DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando el ranking docente" });
  }
});

// 10. DETALLE DE RANKING POR DOCENTE (Desglose por materia)
app.get("/api/reports/teachers-ranking/:id/details", async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        s.subject as subject_name,
        TO_CHAR(s.created_at, 'YYYY-MM-DD') as period_name, -- Use simplified date as period
        ROUND(AVG(a.answer_value), 2) as subject_average,
        COUNT(DISTINCT sub.id) as survey_count
      FROM surveys s
      JOIN submissions sub ON s.id = sub.survey_id
      JOIN answers a ON sub.id = a.submission_id
      WHERE LOWER(TRIM(s.national_id)) = LOWER(TRIM($1)) AND a.answer_value IS NOT NULL
      GROUP BY s.subject, TO_CHAR(s.created_at, 'YYYY-MM-DD')
      ORDER BY subject_average DESC
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo detalles del docente" });
  }
});

// 11. CAMBIAR CONTRASEÑA (SOLO EDITORES)
app.post("/api/auth/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    // Buscar usuario
    const userRes = await pool.query(
      "SELECT * FROM system_users WHERE id = $1",
      [userId],
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = userRes.rows[0];

    // Política: ADMIN no puede cambiar clave por aquí
    if (user.role === "ADMIN") {
      return res.status(403).json({
        error: "Los administradores no pueden cambiar su clave por este medio.",
      });
    }

    // Verificar clave actual
    if (user.password_hash !== currentPassword) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta." });
    }

    // Actualizar clave
    await pool.query(
      "UPDATE system_users SET password_hash = $1 WHERE id = $2",
      [newPassword, userId],
    );

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

// Obtener encuesta para edición (con preguntas y estado de bloqueo)
app.get("/api/admin/surveys/:id/edit", async (req, res) => {
  try {
    const { id } = req.params;

    const surveyRes = await pool.query("SELECT * FROM surveys WHERE id = $1", [
      id,
    ]);
    if (surveyRes.rows.length === 0) {
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }
    const survey = surveyRes.rows[0];

    const questionsRes = await pool.query(
      "SELECT * FROM questions WHERE survey_id = $1 ORDER BY order_index",
      [id],
    );
    survey.questions = questionsRes.rows;

    const submissionsCount = await pool.query(
      "SELECT COUNT(*) FROM submissions WHERE survey_id = $1",
      [id],
    );
    const sessionsCount = await pool.query(
      "SELECT COUNT(*) FROM active_survey_sessions WHERE survey_id = $1",
      [id],
    );

    survey.has_responses = parseInt(submissionsCount.rows[0].count) > 0;
    survey.has_active_sessions = parseInt(sessionsCount.rows[0].count) > 0;

    res.json(survey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener encuesta" });
  }
});

// Editar encuesta (solo si no tiene respuestas ni sesiones activas)
app.put("/api/surveys/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      title,
      description,
      target_audience,
      evaluated_name,
      national_id,
      subject,
      expiration_date,
      is_active,
      questions,
      userId,
      userRole,
    } = req.body;

    if (!title || title.trim() === '') return res.status(400).json({ error: "El título es obligatorio." });
    if (!evaluated_name || evaluated_name.trim() === '') return res.status(400).json({ error: "El nombre del evaluado es obligatorio." });
    if (target_audience === "ESTUDIANTE_A_DOCENTE" && (!subject || subject.trim() === '')) return res.status(400).json({ error: "La materia es obligatoria." });
    if (!questions || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: "Debe haber al menos 1 pregunta." });
    if (national_id && !/^\d+$/.test(national_id.toString().trim())) return res.status(400).json({ error: "La cédula debe contener solo números positivos." });

    // Verificar permisos (similar a DELETE)
    const surveyCheck = await client.query(
      "SELECT created_by FROM surveys WHERE id = $1",
      [id],
    );
    if (surveyCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }
    const survey = surveyCheck.rows[0];

    let canEdit = false;
    if (userRole === "ADMIN") {
      canEdit = true;
    } else if (userRole === "EDITOR") {
      const creatorId = survey.created_by ? String(survey.created_by) : null;
      const reqyuesterId = userId ? String(userId) : null;
      if (creatorId && reqyuesterId && creatorId === reqyuesterId) {
        canEdit = true;
      }
    }
    if (!canEdit) {
      client.release();
      return res
        .status(403)
        .json({ error: "No tienes permiso para editar esta encuesta." });
    }

    // Verificar permiso de edición de indicadores para EDITOR
    let canEditIndicators = false;
    if (userRole === "ADMIN") {
      canEditIndicators = true;
    } else if (userRole === "EDITOR") {
      const userPermsRes = await client.query(
        "SELECT permissions FROM system_users WHERE id = $1",
        [userId]
      );
      if (userPermsRes.rows.length > 0) {
        canEditIndicators = userPermsRes.rows[0].permissions?.can_edit_indicators === true;
      }
    }

    // Validar que no tenga respuestas
    const submissionsRes = await client.query(
      "SELECT COUNT(*) FROM submissions WHERE survey_id = $1",
      [id],
    );
    if (parseInt(submissionsRes.rows[0].count) > 0) {
      client.release();
      return res.status(409).json({
        error: "No se puede editar una encuesta que ya tiene respuestas.",
      });
    }

    // Validar que no tenga sesiones activas
    const sessionsRes = await client.query(
      "SELECT COUNT(*) FROM active_survey_sessions WHERE survey_id = $1",
      [id],
    );
    if (parseInt(sessionsRes.rows[0].count) > 0) {
      client.release();
      return res.status(409).json({
        error:
          "No se puede editar una encuesta que está siendo respondida actualmente.",
      });
    }

    await client.query("BEGIN");

    // Actualizar datos de la encuesta
    //const expirationUTC = new Date(expiration_date).toISOString();
    //console.log("expirationUTC: ", expirationUTC);

    await client.query(
      `UPDATE surveys SET title=$1, description=$2, target_audience=$3, evaluated_name=$4, national_id=$5, subject=$6, expiration_date=$7, is_active=$8 WHERE id=$9`,
      [
        title,
        description,
        target_audience,
        evaluated_name,
        national_id,
        subject,
        expiration_date,
        is_active,
        id,
      ],
    );

    // Eliminar preguntas existentes (seguro porque no hay respuestas)
    await client.query("DELETE FROM questions WHERE survey_id = $1", [id]);

    // Insertar nuevas preguntas
    if (questions && Array.isArray(questions)) {
      const questionQuery = `
      INSERT INTO questions (survey_id, question_text, question_type, order_index, category, help_text, scale_labels)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const scaleLabels = canEditIndicators && q.scale_labels && Object.keys(q.scale_labels).some(k => q.scale_labels[k]?.trim())
          ? JSON.stringify(q.scale_labels)
          : null;
        await client.query(questionQuery, [
          id,
          q.text,
          q.type,
          i,
          q.category || null,
          q.help_text || null,
          scaleLabels,
        ]);
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Encuesta actualizada correctamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al editar encuesta:", error);
    res.status(500).json({ error: "Error interno al editar encuesta" });
  } finally {
    client.release();
  }
});

// Iniciar sesión (cuando el estudiante accede a la encuesta pública)
app.post("/api/public/surveys/:link/start", async (req, res) => {
  const client = await pool.connect();
  try {
    const { link } = req.params;
    const surveyRes = await client.query(
      "SELECT id FROM surveys WHERE access_link = $1",
      [link],
    );
    if (surveyRes.rows.length === 0) {
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }
    const surveyId = surveyRes.rows[0].id;
    const sessionToken = uuidv4();

    await client.query(
      "INSERT INTO active_survey_sessions (survey_id, session_token) VALUES ($1, $2)",
      [surveyId, sessionToken],
    );

    res.json({ sessionToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  } finally {
    client.release();
  }
});

// Finalizar sesión (al cerrar la pestaña o manualmente)
app.post("/api/public/surveys/:link/end", async (req, res) => {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken) {
      return res.status(400).json({ error: "Token requerido" });
    }
    await pool.query(
      "DELETE FROM active_survey_sessions WHERE session_token = $1",
      [sessionToken],
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al finalizar sesión" });
  }
});

// Limpieza de sesiones activas huérfanas (cada hora)
const cleanStaleSessions = async () => {
  try {
    const result = await pool.query(
      "DELETE FROM active_survey_sessions WHERE last_activity < NOW() - INTERVAL '2 minutes'",
    );
    if (result.rowCount > 0) {
      console.log(
        `Limpieza: ${result.rowCount} sesiones huérfanas eliminadas.`,
      );
    }
  } catch (err) {
    console.error("Error en limpieza de sesiones:", err);
  }
};
setInterval(cleanStaleSessions, 5 * 60 * 1000);
cleanStaleSessions(); // ejecutar al inicio

// --- GESTIÓN DE USUARIOS (CRUD) ---

// 1. Obtener todos los usuarios
app.get("/api/admin/users", async (req, res) => {
  try {
    const userRole = req.query.userRole;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: "No autorizado. Se requiere rol ADMIN." });
    }
    const result = await pool.query(
      "SELECT id, username, full_name, role, permissions, created_at FROM system_users ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// 2. Crear usuario
app.post("/api/admin/users", async (req, res) => {
  try {
    const { username, full_name, role, password_hash, adminUserId } = req.body;
    
    // Validar permisos del solicitante
    const adminCheck = await pool.query("SELECT role FROM system_users WHERE id = $1", [adminUserId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'ADMIN') {
      return res.status(403).json({ error: "No autorizado." });
    }

    // Insertar
    const result = await pool.query(
      "INSERT INTO system_users (username, full_name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      [username, full_name, role, password_hash]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: "El nombre de usuario ya existe." });
    }
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// 3. Editar usuario
app.put("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, role, password_hash, adminUserId } = req.body;
    
    // Validar permisos
    const adminCheck = await pool.query("SELECT role FROM system_users WHERE id = $1", [adminUserId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'ADMIN') {
      return res.status(403).json({ error: "No autorizado." });
    }

    // Regla: No degradar al admin maestro
    if (username === 'admin' && role !== 'ADMIN') {
      return res.status(403).json({ error: "El administrador maestro no puede perder su rol ADMIN." });
    }

    let query = "UPDATE system_users SET username = $1, full_name = $2, role = $3";
    const values = [username, full_name, role];

    if (password_hash && password_hash.trim() !== "") {
      query += ", password_hash = $4 WHERE id = $5";
      values.push(password_hash, id);
    } else {
      query += " WHERE id = $4";
      values.push(id);
    }

    await pool.query(query, values);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: "El nombre de usuario ya está en uso." });
    }
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Actualizar permisos de un usuario EDITOR (solo ADMIN)
app.patch("/api/admin/users/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, adminUserId } = req.body;

    const adminCheck = await pool.query(
      "SELECT role FROM system_users WHERE id = $1",
      [adminUserId]
    );
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "ADMIN") {
      return res.status(403).json({ error: "No autorizado." });
    }

    const targetUser = await pool.query(
      "SELECT username, role FROM system_users WHERE id = $1",
      [id]
    );
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    if (targetUser.rows[0].username === "admin") {
      return res.status(403).json({ error: "No se pueden modificar los permisos del administrador maestro." });
    }

    await pool.query(
      "UPDATE system_users SET permissions = $1 WHERE id = $2",
      [JSON.stringify(permissions), id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar permisos" });
  }
});

// 4. Eliminar usuario
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUserId } = req.body;

    const adminCheck = await pool.query("SELECT role FROM system_users WHERE id = $1", [adminUserId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'ADMIN') {
      return res.status(403).json({ error: "No autorizado." });
    }

    // Bloqueos de seguridad
    if (parseInt(id) === parseInt(adminUserId)) {
       return res.status(403).json({ error: "No puedes eliminar tu propia cuenta." });
    }
    const targetQuery = await pool.query("SELECT username FROM system_users WHERE id = $1", [id]);
    if (targetQuery.rows.length > 0 && targetQuery.rows[0].username === 'admin') {
      return res.status(403).json({ error: "La cuenta maestra no puede ser eliminada." });
    }

    await pool.query("DELETE FROM system_users WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listo en http://localhost:${PORT}`);
});

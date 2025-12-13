const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(cors());
app.use(express.json());

// --- RUTAS DE ADMINISTRACIÓN ---

// 1. Crear Encuesta (Admin)
app.post("/api/surveys", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      title,
      description,
      target_audience,
      evaluated_name,
      subject,
      expiration_date,
      questions,
    } = req.body;

    const access_link = uuidv4().split("-")[0];

    await client.query("BEGIN");

    // 1. Insertar Cabecera
    const surveyRes = await client.query(
      `INSERT INTO surveys (title, description, target_audience, evaluated_name, subject, access_link, expiration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        title,
        description,
        target_audience,
        evaluated_name,
        subject,
        access_link,
        expiration_date,
      ]
    );
    const surveyId = surveyRes.rows[0].id;

    // 2. Insertar Preguntas (CORREGIDO: Ahora incluye 'category')
    const questionQuery = `
      INSERT INTO questions (survey_id, question_text, question_type, order_index, category) 
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Pasamos q.category || null por si es una encuesta vieja que no tiene categorías
      await client.query(questionQuery, [
        surveyId,
        q.text,
        q.type,
        i,
        q.category || null,
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

// 2. Login Admin
app.post("/api/admin/login", async (req, res) => {
  const { pin } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM admin_settings WHERE pin_code = $1",
      [pin]
    );
    if (result.rows.length > 0) res.json({ success: true });
    else res.status(401).json({ success: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS PÚBLICAS (ESTUDIANTE / DOCENTE) ---

// 3. OBTENER ENCUESTA POR LINK
app.get("/api/public/surveys/:link", async (req, res) => {
  try {
    const { link } = req.params;

    // a. Buscar encuesta
    const surveyRes = await pool.query(
      `SELECT * FROM surveys WHERE access_link = $1`,
      [link]
    );

    if (surveyRes.rows.length === 0) {
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }

    const survey = surveyRes.rows[0];

    // b. Validar Expiración
    if (new Date() > new Date(survey.expiration_date)) {
      return res
        .status(410)
        .json({ error: "Esta encuesta ha finalizado", expired: true });
    }

    // c. Buscar preguntas (Incluyendo category)
    const questionsRes = await pool.query(
      `SELECT * FROM questions WHERE survey_id = $1 ORDER BY order_index ASC`,
      [survey.id]
    );

    res.json({ ...survey, questions: questionsRes.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 4. GUARDAR RESPUESTAS (SUBMIT) - ACTUALIZADO
app.post("/api/public/submit", async (req, res) => {
  const client = await pool.connect();
  try {
    // Recibimos ahora 'general_comment'
    const { survey_id, answers, general_comment } = req.body;

    await client.query("BEGIN");

    // a. Crear Submission (Incluyendo el comentario)
    const subRes = await client.query(
      `INSERT INTO submissions (survey_id, general_comment) VALUES ($1, $2) RETURNING id`,
      [survey_id, general_comment || null]
    );
    const submissionId = subRes.rows[0].id;

    // b. Guardar Respuestas (Igual que antes)
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
});

// 5. OBTENER LISTA DE ENCUESTAS (Admin)
app.get("/api/admin/surveys", async (req, res) => {
  try {
    const text = `
      SELECT s.*, COUNT(sub.id) as response_count 
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
      [id]
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
          // parseFloat asegura comparar números correctamente
          const found = relevantStats.find(
            (s) => parseFloat(s.answer_value) === star
          );
          return {
            name: `${star}⭐`,
            value: found ? parseInt(found.count) : 0,
          };
        });

        // Lógica NUEVA para DOCENTES (1.0, 0.5, 0.0)
      } else if (q.question_type === "ESCALA_DOCENTE") {
        chartData = [
          { val: 1, label: "SET (1)" },
          { val: 0.5, label: "SEP (0.5)" },
          { val: 0, label: "NSE (0)" },
        ].map((opt) => {
          const found = relevantStats.find(
            (s) => parseFloat(s.answer_value) === opt.val
          );
          return { name: opt.label, value: found ? parseInt(found.count) : 0 };
        });

        // Lógica para Selección Múltiple
      } else if (q.question_type === "SELECCION_MULTIPLE") {
        chartData = relevantStats.map((s) => ({
          name: s.answer_text,
          value: parseInt(s.count),
        }));
      }

      return { ...q, data: chartData };
    });

    res.json({ ...survey, questions_analysis: detailedQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error analizando resultados" });
  }
});

// 7. ELIMINAR ENCUESTA
app.delete("/api/surveys/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM surveys WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Encuesta no encontrada" });
    res.json({ message: "Encuesta eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

// 8. REINICIAR RESULTADOS (Limpiar respuestas de una encuesta)
app.delete("/api/surveys/:id/reset", async (req, res) => {
  try {
    const { id } = req.params;

    // Solo borramos las 'submissions' de esta encuesta.
    // Al borrar la submission, PostgreSQL borra las 'answers' automáticamente (CASCADE)
    await pool.query("DELETE FROM submissions WHERE survey_id = $1", [id]);

    res.json({ message: "Resultados reiniciados a cero." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al reiniciar resultados" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listo en http://localhost:${PORT}`);
});

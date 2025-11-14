// src/routes/chamados.routes.js
import { Router } from "express";
import { unlink } from 'node:fs/promises'; // unlink do fs para apagar arquivo
import { pool } from "../bd/db.js";
import multer from "multer"; // import do multer
import path from "path";     // import do path
import fs from "fs";         // import do fs

const router = Router();

// setup mínimo de upload em disco
const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });


// -----------------------------------------------------------------------------
// ENDPOINT: GET /api/mensagens - Listar todas as mensagens
// -----------------------------------------------------------------------------
// Recupera todos os registos da tabela `mensagens` e retorna-os num array JSON,
// ordenados pelo `id` em ordem decrescente (as mais recentes primeiro).

//GET /api/mensagens
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM "Mensagens" ORDER BY "id" DESC`);
        res.json(rows);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: GET /api/mensagens/:id - Obter uma mensagem específica
// -----------------------------------------------------------------------------
// Procura e retorna uma única mensagem, identificada pelo `id` fornecido como
// parâmetro na URL.

//GET /api/mensagens/:id
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const result = await pool.query(`SELECT * FROM "Mensagens" WHERE "id" = $1`, [id]);
        const { rows } = result;
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: POST /api/mensagens - Criar uma nova mensagem
// -----------------------------------------------------------------------------
// Insere uma nova mensagem na base de dados. Os dados necessários
// (`usuarios_id`, `Usuarios_id_destinatario`, `mensagem`) devem ser enviados no corpo
// da requisição em formato JSON.

//POST /api/mensagens
router.post("/", async (req, res) => {
    const { Usuarios_id, Usuarios_id_destinatario,  mensagem} = req.body ?? {};

    const uId = Number(Usuarios_id);
    const dId = Number(Usuarios_id_destinatario);
    if (!mensagem || typeof(mensagem) != 'string' || uId == null || dId == null || Number.isNaN(uId) || Number.isNaN(dId) || uId < 1 || dId < 1
    || uId == dId) {
        return res.status(400).json({ erro: `Usuarios_id, Usuarios_id_destinatario(Number >= 0 && uId != dId) e
                mensagem(tipo string e não vazio) são obrigatórios` });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO "Mensagens" ("Usuarios_id", "Usuarios_id_destinatario", "mensagem") VALUES ($1, $2, $3) RETURNING *`,
            [uId, dId, mensagem]
        );

        res.status(201).json(rows[0]);
    } catch(erro) {
        console.log(erro);
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: PUT /api/mensagens/:id - Substituir uma mensagem
// -----------------------------------------------------------------------------
// Atualiza um registo de mensagem existente, substituindo **todos** os seus
// campos. Exige que o corpo da requisição contenha a representação completa
// e válida do recurso.

// PUT /api/mensagens/:id
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, Usuarios_id_destinatario,  mensagem } = req.body ?? {};
    const uId = Number(Usuarios_id);
    const dId = Number(Usuarios_id_destinatario);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    if (!mensagem || typeof(mensagem) != 'string' || uId == null || dId == null
    || Number.isNaN(uId) || Number.isNaN(dId)
    || uId < 1 || dId < 1 || uId == dId) {
        return res.status(400).json({ erro: `usuarios_id, Usuarios_id_destinatario(Number >= 0 && uId != dId) e
                mensagem(tipo string e não vazio) são obrigatórios` });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE "Mensagens" SET "Usuarios_id" = $1, "Usuarios_id_destinatario" = $2, "mensagem" = $3 WHERE "id" = $4 RETURNING *`,
            [Usuarios_id, Usuarios_id_destinatario, mensagem, id]
        );

        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: PATCH /api/mensagens/:id - Atualizar parcialmente uma mensagem
// -----------------------------------------------------------------------------
// Modifica um ou mais campos de uma mensagem existente. Apenas os campos
// presentes no corpo da requisição serão alterados. Campos omitidos
// permanecerão com os seus valores atuais na base de dados, graças ao uso
// da função COALESCE do SQL.

// /api/mensagens/:id
router.patch("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, Usuarios_id_destinatario,  mensagem } = req.body ?? {};

    const uId = Number(Usuarios_id);
    const dId = Number(Usuarios_id_destinatario);


    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    if (mensagem === undefined && Usuarios_id_destinatario === undefined && usuarios_id === undefined) {
        return res.status(400).json({ erro: "envie usuarios_id, destinatarios_id e/ou mensagem" });
    }

    if (Usuarios_id !== undefined) {
        if (Number.isNaN(uId) || uId < 0) {
            return res.status(400).json({ erro: "ids de usuario devem ser número >= 0" });
        }
    }

    if(Usuarios_id_destinatario !== undefined){
        if( Number.isNaN(dId) || dId < 0){
            return res.status(400).json({erro: "ids de destinatario devem ser número >= 0"})
        }
    }

    try {
        const { rows } = await pool.query(
            `UPDATE Mnsagens SET "mensagem" = COALESCE($1, "mensagem"), "Usuarios_id" = COALESCE($2, "Usuarios_id"),
            "Usuarios_id_destinatario" = COALESCE($3, "Usuarios_id_destinatario") WHERE 'id' = $4 RETURNING *`,
            [mensagem ?? null, Usuarios_id ?? null, Usuarios_id_destinatario ?? null, id]
        );

        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: DELETE /api/mensagens/:id - Apagar uma mensagem
// -----------------------------------------------------------------------------
// Remove permanentemente uma mensagem da base de dados, identificada pelo seu `id`.

// DELETE /api/mensagens/:id
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const r = await pool.query(`DELETE FROM "Mensagens" WHERE 'id' = $1 RETURNING "id"  `, [id]);

        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });

        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});







export default router;
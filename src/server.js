/**
 * @file Ficheiro principal da API de Mensagens
 * @description Implementação de uma API RESTful para gerir mensagens, utilizando Express.js e PostgreSQL.
 *
 * @summary
 * Este ficheiro configura um servidor Express para expor endpoints de um CRUD (Create, Read, Update, Delete)
 * para uma entidade "mensagens". A ligação à base de dados é gerida por um pool de conexões.
 *
 * @notes
 * - A segurança contra SQL Injection é assegurada através do uso de queries parametrizadas (ex: $1, $2).
 * - O tratamento de erros é simplificado, retornando códigos de status HTTP apropriados para
 * diferentes cenários (ex: 404 para não encontrado, 400 para dados inválidos).
 */

// -----------------------------------------------------------------------------
// IMPORTAÇÕES E CONFIGURAÇÃO INICIAL
// -----------------------------------------------------------------------------
import express from "express";
import { pool } from "./db.js"; // "pool" gere as conexões com o PostgreSQL
const app = express();

app.use(express.json());
// Middleware que interpreta o corpo (body) de requisições com `Content-Type: application/json`.
// Converte a string JSON recebida num objeto JavaScript acessível via `req.body`.

// -----------------------------------------------------------------------------
// ENDPOINT: GET / - Documentação da API
// -----------------------------------------------------------------------------
// Rota de entrada que serve como uma documentação rápida, listando todos
// os endpoints disponíveis e como utilizá-los.
app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /api/mensagens",
            "MOSTRAR": "GET /api/mensagens/:id",
            "CRIAR": "POST /api/mensagens BODY: { 'usuarios_id': number, 'destinatario_id': number, 'mensagem': string }",
            "SUBSTITUIR": "PUT /api/mensagens/:id BODY: { 'usuarios_id': number, 'destinatario_id': number, 'mensagem': string }",
            "ATUALIZAR": "PATCH /api/mensagens/:id BODY: { 'usuarios_id': number || 'destinatario_id': number || 'mensagem': string }",
            "DELETAR": "DELETE /api/mensagens/:id",
        };
        res.json(rotas);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: GET /api/mensagens - Listar todas as mensagens
// -----------------------------------------------------------------------------
// Recupera todos os registos da tabela `mensagens` e retorna-os num array JSON,
// ordenados pelo `id` em ordem decrescente (as mais recentes primeiro).
app.get("/api/mensagens", async (_req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM mensagens ORDER BY id DESC");
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
app.get("/api/mensagens/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const result = await pool.query("SELECT * FROM mensagens WHERE id = $1", [id]);
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
// (`usuarios_id`, `destinatario_id`, `mensagem`) devem ser enviados no corpo
// da requisição em formato JSON.
app.post("/api/mensagens", async (req, res) => {
    const { usuarios_id, destinatario_id,  mensagem} = req.body ?? {};

    const uId = Number(usuarios_id);
    const dId = Number(destinatario_id);
    if (!mensagem || typeof(mensagem) != 'string' || uId == null || dId == null || Number.isNaN(uId) || Number.isNaN(dId) || uId < 1 || dId < 1
    || uId == dId) {
        return res.status(400).json({ erro: `usuarios_id, destinatario_id(Number >= 0 && uId != dId) e
                mensagem(tipo string e não vazio) são obrigatórios` });
    }

    try {
        const { rows } = await pool.query(
            "INSERT INTO mensagens (usuarios_id, destinatario_id, mensagem) VALUES ($1, $2, $3) RETURNING *",
            [uId, dId, mensagem]
        );

        res.status(201).json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT: PUT /api/mensagens/:id - Substituir uma mensagem
// -----------------------------------------------------------------------------
// Atualiza um registo de mensagem existente, substituindo **todos** os seus
// campos. Exige que o corpo da requisição contenha a representação completa
// e válida do recurso.
app.put("/api/mensagens/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { usuarios_id, destinatario_id,  mensagem } = req.body ?? {};
    const uId = Number(usuarios_id);
    const dId = Number(destinatario_id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    if (!mensagem || typeof(mensagem) != 'string' || uId == null || dId == null
    || Number.isNaN(uId) || Number.isNaN(dId)
    || uId < 1 || dId < 1 || uId == dId) {
        return res.status(400).json({ erro: `usuarios_id, destinatario_id(Number >= 0 && uId != dId) e
                mensagem(tipo string e não vazio) são obrigatórios` });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE mensagens SET usuarios_id = $1, destinatario_id = $2, mensagem = $3 WHERE id = $4 RETURNING *`,
            [usuarios_id, destinatario_id, mensagem, id]
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
app.patch("/api/mensagens/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { usuarios_id, destinatario_id,  mensagem } = req.body ?? {};

    const uId = Number(usuarios_id);
    const dId = Number(destinatario_id);


    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    if (mensagem === undefined && destinatario_id === undefined && usuarios_id === undefined) {
        return res.status(400).json({ erro: "envie usuarios_id, destinatarios_id e/ou mensagem" });
    }

    if (usuarios_id !== undefined) {
        if (Number.isNaN(uId) || uId < 0) {
            return res.status(400).json({ erro: "ids de usuario devem ser número >= 0" });
        }
    }

    if(destinatario_id !== undefined){
        if( Number.isNaN(dId) || dId < 0){
            return res.status(400).json({erro: "ids de destinatario devem ser número >= 0"})
        }
    }

    try {
        const { rows } = await pool.query(
            `UPDATE mensagens SET mensagem = COALESCE($1, mensagem), usuarios_id = COALESCE($2, usuarios_id),
            destinatario_id = COALESCE($3, destinatario_id) WHERE id = $4 RETURNING *`,
            [mensagem ?? null, usuarios_id ?? null, destinatario_id ?? null, id]
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
app.delete("/api/mensagens/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const r = await pool.query("DELETE FROM mensagens WHERE id = $1 RETURNING id", [id]);

        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });

        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR
// -----------------------------------------------------------------------------
// Define a porta em que o servidor irá escutar. Utiliza a variável de ambiente PORT,
// se disponível (comum em ambientes de produção), ou a porta 3000 por defeito.
const PORT = process.env.PORT || 3000;

// Inicia o servidor HTTP, que passará a escutar por requisições na porta definida.
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));


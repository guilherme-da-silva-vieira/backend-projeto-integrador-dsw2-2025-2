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
import cors from "cors";
import usuariosRoutes from "./routes/usuarios.routes.js";
import router from "./routes/mensagens.routes.js";
import { authMiddleware } from "./middlewares/auth.js";
import cookieParser from "cookie-parser";
const app = express();
//configura em modo permissivo
app.use(cors());
app.use(cookieParser());
// converte em dados json  e coloca em req.body
app.use(express.json());

app.use("/api/usuarios", usuariosRoutes); // configurando as rotas de usuário
app.use("/api/mensagens", authMiddleware, router);
// Middleware que interpreta o corpo (body) de requisições com `Content-Type: application/json`.
// Converte a string JSON recebida num objeto JavaScript acessível via `req.body`.

// -----------------------------------------------------------------------------
// ENDPOINT: GET / - Documentação da API
// -----------------------------------------------------------------------------
// Rota de entrada que serve como uma documentação rápida, listando todos
// os endpoints disponíveis e como utilizá-los.


// app.get("/", async (_req, res) => {
    // try {
        // const rotas = {
            // "LISTAR": "GET /api/mensagens",
            // "MOSTRAR": "GET /api/mensagens/:id",
            // "CRIAR": "POST /api/mensagens BODY: { 'usuarios_id': number, 'destinatario_id': number, 'mensagem': string }",
            // "SUBSTITUIR": "PUT /api/mensagens/:id BODY: { 'usuarios_id': number, 'destinatario_id': number, 'mensagem': string }",
            // "ATUALIZAR": "PATCH /api/mensagens/:id BODY: { 'usuarios_id': number || 'destinatario_id': number || 'mensagem': string }",
            // "DELETAR": "DELETE /api/mensagens/:id",
        // };
        // res.json(rotas);
    // } catch {
        // res.status(500).json({ erro: "erro interno" });
    // }
// });

// -----------------------------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR
// -----------------------------------------------------------------------------
// Define a porta em que o servidor irá escutar. Utiliza a variável de ambiente PORT,
// se disponível (comum em ambientes de produção), ou a porta 3000 por defeito.
const PORT = process.env.PORT || 3000;

// Inicia o servidor HTTP, que passará a escutar por requisições na porta definida.
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));


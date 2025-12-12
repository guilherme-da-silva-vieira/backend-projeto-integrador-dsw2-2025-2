import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import readline from 'readline';
import { Client } from "pg";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function pergunta(query) {
    return new Promise(resolve => {
        rl.question(query, resolve);
    });
}
dotenv.config();
const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })
client.connect();
async function createAdmin() {
    try {
        const papel = 0;
        const nome = await pergunta("Qual é o seu nome:");
        const email = await pergunta("Qual é o seu e-mail:");
        const senha = await pergunta("Qual é sua senha:");
        rl.close();
        if (!nome || !email || !senha) {
            console.log("Campos vazios, tente novamente!");
            return;
        }
        else if(senha.length < 6){
            console.log("Senha Menor que 6 caracteres, tente novamente!");
            return;
        }
        const senha_hash = await bcrypt.hash(senha,12);
        const consulta = await client.query(`INSERT INTO "Usuarios"("nome","email","senha_hash","papel") VALUES($1,$2,$3,$4)
            RETURNING "id","nome", "email", "senha_hash", "papel"`,
            [String(nome).trim(),String(email).trim().toLowerCase(),senha_hash,papel]);
        const user = consulta.rows[0];
        await client.end();
        if(!user){
            console.log("Não foi possível criar usuário!");
            return;
        }
        else{
            console.log("Usuário administrador criado com sucesso!");
            console.log(user);
            return;
        }
    }
    catch{
        console.log("Um erro ocorreu durante a execução!");
        return;
    }
}

createAdmin();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

app.use('/empresas', require('./empresa_back'));
app.use('/funcionarios', require('./funcionario_back'));
app.use('/pedidos', require('./pedido_back'));
app.use('/super_adm', require('./super_adm_back'))

async function conectarAoMongoDB() {
    try {
        const uri = process.env.MONGO_URI || "mongodb+srv://igormlaranjeira_db_user:1234@aacdpi.duw7cwa.mongodb.net/3dconecta?retryWrites=true&w=majority";
        await mongoose.connect(uri);
        console.log("Conectado ao MongoDB com sucesso!");
    } catch (err) {
        console.error("Erro crítico na conexão com o banco:", err.message);
        process.exit(1);
    }
}

app.listen(3000, async () => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    await conectarAoMongoDB();
    console.log("Servidor ativo e escutando na porta 3000!");
});
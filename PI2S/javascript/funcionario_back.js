const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const Funcionario = mongoose.model("Funcionario", mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    empresa: { type: String, required: true },
}));

// ==================== ROTAS CRUD DE FUNCIONÁRIOS ====================

// 1. CREATE: Cadastrar funcionário
app.post("/funcionarios", async (req, res) => {
    try {
        const novoFuncionario = new Funcionario({
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha,
            empresa: req.body.empresa,
        });

        await novoFuncionario.save();
        res.status(201).json(novoFuncionario);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar o funcionário", detalhe: error.message });
    }
});

// 2. READ: Buscar todos os funcionários
app.get("/funcionarios", async (req, res) => {
    try {
        const funcionarios = await Funcionario.find();
        res.json(funcionarios);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os funcionários" }); // Correção gramatical
    }
});

// 3. READ by ID
app.get("/funcionarios/:id", async (req, res) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);
        if (!funcionario) return res.status(404).json({ erro: "Funcionário não encontrado" });
        res.json(funcionario);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o funcionário" });
    }
});

// 5. UPDATE: Atualizar dados do funcionário
app.put("/funcionarios/:id", async (req, res) => {
    try {
        const dadosAtualizados = { ...req.body };
        const funcionarioAtualizado = await Funcionario.findByIdAndUpdate(
            req.params.id, 
            dadosAtualizados, 
            { new: true }
        );

        if (!funcionarioAtualizado) return res.status(404).json({ erro: "Funcionário não encontrado" });
        res.json(funcionarioAtualizado);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar o funcionário", detalhe: error.message });
    }
});

// 6. DELETE: Remover funcionário
app.delete("/funcionarios/:id", async (req, res) => {
    try {
        const funcionarioDeletado = await Funcionario.findByIdAndDelete(req.params.id);
        if (!funcionarioDeletado) return res.status(404).json({ erro: "Funcionário não encontrado" });
        
        res.json({ mensagem: "Funcionário removido com sucesso!" }); // Correção de texto repetido
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar o funcionário" }); // Correção de erro de digitação ("funciempresaonario")
    }
});

// Conexão com MongoDB Atlas
async function conectarAoMongoDB() {
    try {
        await mongoose.connect('mongodb+srv://usuario:senha@cluster.mongodb.net/suaBase?retryWrites=true&w=majority');
        console.log("Conectado ao MongoDB!");
    } catch (error) {
        console.error("Erro ao conectar no banco:", error.message);
    }
}

app.listen(3000, () => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    conectarAoMongoDB();
    console.log("Servidor ativo na porta 3000!");
});

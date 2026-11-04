const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração opcional do Multer para uploads futuros
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// ==================== SCHEMAS ANINHADOS (MONGOOSE) ====================

// 1. O subdocumento do Volume Útil (dentro da impressora)
const VolumeUtilSchema = new mongoose.Schema({
    x: { type: Number, required: true }, // Largura em mm
    y: { type: Number, required: true }, // Profundidade em mm
    z: { type: Number, required: true }  // Altura em mm
}, { _id: false }); // Desativa o _id automático para este objeto simples

// 2. O Schema da Impressora
const ImpressoraSchema = new mongoose.Schema({
    nome_impressora: { type: String, required: true },
    marca: { type: String, required: true },
    volume_util: VolumeUtilSchema,               // Objeto aninhado (Não separado)
    filamentos: [{ type: String }]              // Lista de strings (Ex: ["PLA", "ABS"])
});

// 3. O Schema Principal da Empresa
const EmpresaSchema = new mongoose.Schema({
    nome_empresa: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true }, // Mantido como String para preservar zeros à esquerda
    impressoras: [ImpressoraSchema]             // Array de impressoras dentro da Empresa
});

const Empresa = mongoose.model("Empresa", EmpresaSchema);

// ==================== ROTAS CRUD DE EMPRESAS ====================

// 1. CREATE: Cadastrar nova Empresa
app.post("/funcionarios", async (req, res) => {
    try {
        const novaEmpresa = new Empresa({
            nome_empresa: req.body.nome_empresa,
            email: req.body.email,
            senha: req.body.senha,
            cnpj: req.body.cnpj,
            impressoras: [] // Inicia o array de impressoras vazio
        });

        await novaEmpresa.save();
        res.status(201).json(novaEmpresa);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar a empresa", detalhe: error.message });
    }
});

// 2. READ: Buscar todas as Empresas
app.get("/funcionarios", async (req, res) => {
    try {
        const empresas = await Empresa.find();
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar as empresas" });
    }
});

// 3. READ: Buscar Empresa por ID
app.get("/funcionarios/:id", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
        res.json(empresa);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar a empresa" });
    }
});

// 4. UPDATE: Atualizar dados cadastrais da Empresa
app.put("/funcionarios/:id", async (req, res) => {
    try {
        const empresaAtualizada = await Empresa.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );

        if (!empresaAtualizada) return res.status(404).json({ erro: "Empresa não encontrada" });
        res.json(empresaAtualizada);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar a empresa", detalhe: error.message });
    }
});

// 5. DELETE: Remover Empresa completa do banco
app.delete("/funcionarios/:id", async (req, res) => {
    try {
        const empresaDeletada = await Empresa.findByIdAndDelete(req.params.id);
        if (!empresaDeletada) return res.status(404).json({ erro: "Empresa não encontrada" });
        
        res.json({ mensagem: "Empresa removida com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar a empresa" });
    }
});

// ==================== ROTAS DE GERENCIAMENTO DE IMPRESSORAS ====================

// 6. ADICIONAR IMPRESSORA EM UMA EMPRESA
/* 
   Exemplo de JSON para enviar no POST (body):
   {
       "nome_impressora": "Ender 3 V2",
       "marca": "Creality",
       "volume_util": { "x": 220, "y": 220, "z": 250 },
       "filamentos": ["PLA", "ABS"]
   }
*/
app.post("/funcionarios/:id/impressoras", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

        // Dá um push dos dados recebidos diretamente no array da empresa encontrada
        empresa.impressoras.push(req.body);
        await empresa.save(); // Salva o documento pai atualizado

        res.status(201).json(empresa);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao adicionar impressora", detalhe: error.message });
    }
});

// 7. LISTAR APENAS AS IMPRESSORAS DE UMA EMPRESA
app.get("/funcionarios/:id/impressoras", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
        
        res.json(empresa.impressoras);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar as impressoras" });
    }
});

// 8. REMOVER UMA IMPRESSORA ESPECÍFICA DE UMA EMPRESA
app.delete("/funcionarios/:empresaId/impressoras/:impressoraId", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.empresaId);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

        // Remove a impressora da lista usando o método integrado do Mongoose
        empresa.impressoras.pull({ _id: req.params.impressoraId });
        await empresa.save();

        res.json({ mensagem: "Impressora removida com sucesso!", empresa });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao remover a impressora", detalhe: error.message });
    }
});

// ==================== CONEXÃO E INICIALIZAÇÃO ====================
async function conectarAoMongoDB() {
    try {
        // Lembre-se de substituir 'usuario' e 'senha' pelas suas credenciais reais do Atlas
        await mongoose.connect('mongodb+srv://usuario:senha@cluster.mongodb.net/suaBase?retryWrites=true&w=majority');
        console.log("Conectado ao MongoDB com sucesso!");
    } catch (err) {
        console.error("Erro crítico na conexão com o banco:", err.message);
    }
}

app.listen(3000, () => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    conectarAoMongoDB();
    console.log("Servidor ativo e escutando na porta 3000!");
});
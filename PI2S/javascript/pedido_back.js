const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração do Multer para salvar arquivos STL/3MF
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Schema atualizado com descrição e status
const Pedido = mongoose.model("Pedido", mongoose.Schema({
    nome: { type: String },
    tempo_estimado: { type: String, default: "2 dias" },
    tipo_filamento: { type: String },
    descricao: { type: String },
    empresa_fabricante: { type: String, default: "" },
    empresa_receptora: { type: String, default: "AACD / Cliente" },
    agente_fabricante: { type: String, default: "" },
    agente_receptor: { type: String, default: "Usuário" },
    status: { type: String, default: "pendente" }, // 'pendente', 'andamento', 'concluido'
    arquivoPath: { type: String },
    arquivoOriginal: { type: String }
}));

// ==================== ROTAS CRUD DE PEDIDOS ====================

// 1. CREATE: Enviar formulário com arquivo 3D
app.post("/pedidos", upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: "Nenhum arquivo STL/3MF foi enviado." });
        }

        const novoPedido = new Pedido({
            nome: req.body.nome,
            tipo_filamento: req.body.tipo_filamento,
            descricao: req.body.descricao,
            tempo_estimado: req.body.tempo_estimado || "2 dias",
            status: "pendente",
            arquivoPath: req.file.path,
            arquivoOriginal: req.file.originalname
        });

        await novoPedido.save();
        res.status(201).json(novoPedido);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar o pedido", detalhe: error.message });
    }
});

// 2. READ: Buscar todos os pedidos
app.get("/pedidos", async (req, res) => {
    try {
        const pedidos = await Pedido.find();
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os pedidos" });
    }
});

// 3. READ by ID
app.get("/pedidos/:id", async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o pedido" });
    }
});

// 4. DOWNLOAD do arquivo 3D
app.get("/pedidos/download/:id", async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido || !pedido.arquivoPath) {
            return res.status(404).json({ erro: "Arquivo não encontrado." });
        }
        const caminhoArquivo = path.resolve(pedido.arquivoPath);
        if (!fs.existsSync(caminhoArquivo)) {
            return res.status(404).json({ erro: "O arquivo físico não foi encontrado no servidor." });
        }
        res.download(caminhoArquivo, pedido.arquivoOriginal);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao processar o download" });
    }
});

// 5. UPDATE: Atualizar dados ou status (ex: Aceitar pedido, Concluir pedido)
app.put("/pedidos/:id", upload.single('arquivo'), async (req, res) => {
    try {
        const dadosAtualizados = { ...req.body };
        if (req.file) {
            dadosAtualizados.arquivoPath = req.file.path;
            dadosAtualizados.arquivoOriginal = req.file.originalname;
        }

        const pedidoAtualizado = await Pedido.findByIdAndUpdate(
            req.params.id, 
            dadosAtualizados, 
            { new: true }
        );

        if (!pedidoAtualizado) return res.status(404).json({ erro: "Pedido não encontrado" });
        res.json(pedidoAtualizado);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar o pedido", detalhe: error.message });
    }
});

// 6. DELETE: Remover pedido e arquivo físico
app.delete("/pedidos/:id", async (req, res) => {
    try {
        const pedidoDeletado = await Pedido.findByIdAndDelete(req.params.id);
        if (!pedidoDeletado) return res.status(404).json({ erro: "Pedido não encontrado" });
        
        if (pedidoDeletado.arquivoPath && fs.existsSync(pedidoDeletado.arquivoPath)) {
            fs.unlinkSync(pedidoDeletado.arquivoPath);
        }

        res.json({ mensagem: "Pedido e arquivo removidos com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar o pedido" });
    }
});

// Conexão com MongoDB Atlas
async function conectarAoMongoDB() {
    await mongoose.connect('mongodb+srv://usuario:senha@cluster.mongodb.net/suaBase?retryWrites=true&w=majority');
}

app.listen(3000, () => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    conectarAoMongoDB();
    console.log("Servidor ativo na porta 3000!");
});
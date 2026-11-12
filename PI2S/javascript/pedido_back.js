const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const pastaModelos = path.join(__dirname, 'modelos');
if (!fs.existsSync(pastaModelos)) fs.mkdirSync(pastaModelos, { recursive: true });

async function gerarModelo(caminhoArquivo, nomeOriginal) {
    const from = path.extname(nomeOriginal).slice(1).toLowerCase();

    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(caminhoArquivo)]), nomeOriginal);
    form.append('from', from);
    form.append('to', 'glb');

    const r = await fetch('https://api.convert3d.org/convert', {
        method: 'POST',
        headers: { Authorization: `Bearer c3d_live_KU4KlhdsHlFuiECeQAApyaiEOpsVhhCg` },
        body: form
    });
    if (!r.ok) throw new Error(`Convert3D respondeu ${r.status}: ${await r.text()}`);

    const destino = path.join(pastaModelos, `${Date.now()}.glb`);
    fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
    return destino;
}

const pastaUploads = path.join(__dirname, 'uploads');
if (!fs.existsSync(pastaUploads)) fs.mkdirSync(pastaUploads, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaUploads);
    },
    filename: (req, file, cb) => {
        const nomeSeguro = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + nomeSeguro);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.stl' || ext === '.3mf') {
        cb(null, true);
    } else {
        cb(new Error("Formato inválido. Envie apenas arquivos .STL ou .3MF."));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

function uploadArquivo(req, res, next) {
    upload.single('arquivo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        next();
    });
}


const Pedido = mongoose.model("Pedido", new mongoose.Schema({
    nome: { type: String },
    tempo_estimado: { type: String, default: "" },
    tipo_filamento: { type: String },
    descricao: { type: String },
    empresa_fabricante: { type: String, default: "" },
    empresa_receptora: { type: String, default: "" },
    agente_fabricante: { type: String, default: "" },
    agente_receptor: { type: String, default: "" },
    status: { type: String, default: "pendente" },
    arquivoPath: { type: String },
    arquivoOriginal: { type: String },
    modeloPath: { type: String, default: "" },
    data_criacao: { type: Date },
    data_andamento: { type: Date },
    data_conclusao: { type: Date }
}));

router.post("/", uploadArquivo, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: "Nenhum arquivo STL/3MF foi enviado." });
        }
        let modeloPath = "";
        try {
            modeloPath = await gerarModelo(req.file.path, req.file.originalname);
        } catch (e) {
            console.error("Falha ao gerar modelo 3D:", e.message);
        }
        const novoPedido = new Pedido({
            nome: req.body.nome,
            tempo_estimado: req.body.tempo_estimado,
            tipo_filamento: req.body.tipo_filamento,
            descricao: req.body.descricao,
            empresa_fabricante: "",
            empresa_receptora: req.body.empresa_receptora,
            agente_fabricante: "",
            agente_receptor: req.body.agente_receptor,
            status: "pendente",
            arquivoPath: req.file.path,
            arquivoOriginal: req.file.originalname,
            modeloPath,
            data_criacao: Date.now(),
            data_andamento: null,
            data_conclusao: null
        });

        await novoPedido.save();
        res.status(201).json(novoPedido);
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ erro: "Erro ao salvar o pedido", detalhe: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const pedidos = await Pedido.find();
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os pedidos" });
    }
});

router.get("/download/:id", async (req, res) => {
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

router.get("/modelo/:id", async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido || !pedido.modeloPath || !fs.existsSync(pedido.modeloPath)) {
            return res.status(404).json({ erro: "Modelo 3D não encontrado." });
        }
        res.type('model/gltf-binary');
        res.sendFile(path.resolve(pedido.modeloPath));
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o modelo 3D" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o pedido" });
    }
});

router.put("/:id", uploadArquivo, async (req, res) => {
    try {
        const dadosAtualizados = { ...req.body };

        const pedidoAntigo = await Pedido.findById(req.params.id);
        if (!pedidoAntigo) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(404).json({ erro: "Pedido não encontrado" });
        }

        if (req.file) {
            dadosAtualizados.arquivoPath = req.file.path;
            dadosAtualizados.arquivoOriginal = req.file.originalname;
            try {
                dadosAtualizados.modeloPath = await gerarModelo(req.file.path, req.file.originalname);
            } catch (e) {
                console.error("Falha ao gerar modelo 3D:", e.message);
                dadosAtualizados.modeloPath = "";
            }
        }

        const pedidoAtualizado = await Pedido.findByIdAndUpdate(
            req.params.id,
            dadosAtualizados,
            { new: true }
        );

        if (req.file && pedidoAntigo.arquivoPath && fs.existsSync(pedidoAntigo.arquivoPath)) {
            fs.unlinkSync(pedidoAntigo.arquivoPath);
        }

        if (req.file && pedidoAntigo.modeloPath && fs.existsSync(pedidoAntigo.modeloPath)) {
            fs.unlinkSync(pedidoAntigo.modeloPath);
        }

        res.json(pedidoAtualizado);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar o pedido", detalhe: error.message });
    }
});

router.delete("/delete/:id", async (req, res) => {
    try {
        const pedidoDeletado = await Pedido.findByIdAndDelete(req.params.id);
        if (!pedidoDeletado) return res.status(404).json({ erro: "Pedido não encontrado" });

        if (pedidoDeletado.arquivoPath && fs.existsSync(pedidoDeletado.arquivoPath)) {
            fs.unlinkSync(pedidoDeletado.arquivoPath);
        }

        if (pedidoDeletado.modeloPath && fs.existsSync(pedidoDeletado.modeloPath)) {
            fs.unlinkSync(pedidoDeletado.modeloPath);
        }
        res.json({ mensagem: "Pedido e arquivo removidos com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar o pedido" });
    }
});

module.exports = router;
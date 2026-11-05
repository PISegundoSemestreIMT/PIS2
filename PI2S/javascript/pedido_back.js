const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const Pedido = mongoose.model("Pedido", new mongoose.Schema({
    nome: { type: String },
    tempo_estimado: { type: String, default: "" },
    tipo_filamento: { type: String },
    descricao: { type: String },
    empresa_fabricante: { type: String, default: "" },
    empresa_receptora: { type: String, default: "" },
    agente_fabricante: { type: String, default: "" },
    agente_receptor: { type: String, default: "Usuário" },
    status: { type: String, default: "pendente" },
    arquivoPath: { type: String },
    arquivoOriginal: { type: String },
    data_criacao: { type: Date },
    data_andamento: { type: Date },
    data_conclusao: { type: Date }
}));

router.post("/", upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: "Nenhum arquivo STL/3MF foi enviado." });
        }

        const novoPedido = new Pedido({
            nome: req.body.nome,
            tipo_filamento: req.body.tipo_filamento,
            descricao: req.body.descricao,
            tempo_estimado: req.body.tempo_estimado,
            status: "pendente",
            arquivoPath: req.file.path,
            arquivoOriginal: req.file.originalname,
            data_criacao: Date.now(),
            data_andamento: null,
            data_conclusao: null
        });

        await novoPedido.save();
        res.status(201).json(novoPedido);
    } catch (error) {
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

router.get("/:id", async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o pedido" });
    }
});

router.put("/:id", upload.single('arquivo'), async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

module.exports = router;
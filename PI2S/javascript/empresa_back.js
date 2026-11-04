const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const VolumeUtilSchema = new mongoose.Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
}, { _id: false });

const ImpressoraSchema = new mongoose.Schema({
    nome_impressora: { type: String, required: true },
    marca: { type: String, required: true },
    volume_util: VolumeUtilSchema,
    filamentos: [{ type: String }]
});

const EmpresaSchema = new mongoose.Schema({
    nome_empresa: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true },
    impressoras: [ImpressoraSchema]
});

const Empresa = mongoose.model("Empresa", EmpresaSchema);

router.post("/", async (req, res) => {
    try {
        const novaEmpresa = new Empresa({
            nome_empresa: req.body.nome_empresa,
            email: req.body.email,
            senha: req.body.senha,
            cnpj: req.body.cnpj,
            impressoras: []
        });

        await novaEmpresa.save();
        res.status(201).json(novaEmpresa);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar a empresa", detalhe: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const empresas = await Empresa.find();
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar as empresas" });
    }
});

router.get("/:id/impressoras", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

        res.json(empresa.impressoras);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar as impressoras" });
    }
});

router.post("/:id/impressoras", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

        empresa.impressoras.push(req.body);
        await empresa.save();

        res.status(201).json(empresa);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao adicionar impressora", detalhe: error.message });
    }
});

router.delete("/:empresaId/impressoras/:impressoraId", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.empresaId);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });

        empresa.impressoras.pull({ _id: req.params.impressoraId });
        await empresa.save();

        res.json({ mensagem: "Impressora removida com sucesso!", empresa });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao remover a impressora", detalhe: error.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const empresa = await Empresa.findById(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada" });
        res.json(empresa);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar a empresa" });
    }
});

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
    try {
        const empresaDeletada = await Empresa.findByIdAndDelete(req.params.id);
        if (!empresaDeletada) return res.status(404).json({ erro: "Empresa não encontrada" });

        res.json({ mensagem: "Empresa removida com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar a empresa" });
    }
});

module.exports = router;
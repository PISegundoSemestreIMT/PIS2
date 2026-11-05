const express = require('express');
const mongoose = require('mongoose');
const { type } = require('node:os');

const router = express.Router();

const Funcionario = mongoose.model("Funcionario", new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    empresa: { type: String, required: true },
}));

router.post("/", async (req, res) => {
    try {
        const novoFuncionario = new Funcionario({
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha,
        });

        await novoFuncionario.save();
        res.status(201).json(novoFuncionario);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar o funcionário", detalhe: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const funcionarios = await Funcionario.find();
        res.json(funcionarios);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar os funcionários" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const funcionario = await Funcionario.findById(req.params.id);
        if (!funcionario) return res.status(404).json({ erro: "Funcionário não encontrado" });
        res.json(funcionario);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o funcionário" });
    }
});

router.get("/:email", async (req, res) => {
  try {
    const funcionario = await Funcionario.findOne({ email: req.params.email }).select("+nome +empresa +senha +tipo");

    if (!funcionario) {
      return res.status(404).json({ erro: "Funcionário não encontrado" });
    }
    res.json(funcionario);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar o funcionário" });
  }
});


router.put("/:id", async (req, res) => {
    try {
        const funcionarioAtualizado = await Funcionario.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true }
        );

        if (!funcionarioAtualizado) return res.status(404).json({ erro: "Funcionário não encontrado" });
        res.json(funcionarioAtualizado);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar o funcionário", detalhe: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const funcionarioDeletado = await Funcionario.findByIdAndDelete(req.params.id);
        if (!funcionarioDeletado) return res.status(404).json({ erro: "Funcionário não encontrado" });

        res.json({ mensagem: "Funcionário removido com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar o funcionário" });
    }
});

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Super_adm = mongoose.model("Super_adm", new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
}), "super_adm");
router.get("/busca-email/:email", async (req, res) => {
  try {
    const super_adm = await Super_adm.findOne({ email: req.params.email }).select("+senha");

    if (!super_adm) {
      return res.status(404).json({ erro: "super adm não encontrado" });
    }
    res.json(super_adm);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar o super adm" });
  }
});

module.exports = router;
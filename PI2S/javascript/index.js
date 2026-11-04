const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
app.use(cors());

async function conectarAoMongoDB() {
  await mongoose.connect(``);
}

app.listen(3000, () => {
  try {
    conectarAoMongoDB();
    console.log("Servidor ativo e conectado ao MongoDB");
  }
  catch (e) {
    console.log('Erro ao conectar ao banco de dados:', e);
  }
});
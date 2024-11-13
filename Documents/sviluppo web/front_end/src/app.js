const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Importa le route dai file modularizzati
const authRoutes = require('./routes/authRoutes');
const anagRoutes = require('./routes/anagRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Usa le route modularizzate con un prefisso
app.use('/api/auth', authRoutes);  // Route di autenticazione
app.use('/api/cliente', anagRoutes); // Route per gli utenti

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});

module.exports = app;
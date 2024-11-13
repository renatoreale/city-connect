const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { savePassword } = require('../encrypt');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password, email, nomeGatto } = req.body;

        // Controllo preliminare: verifica se l'email è già registrata nella tabella users
        const emailCheckQuery = 'SELECT id_cliente FROM users WHERE mail = ?';
        const [existingUser] = await db.query(emailCheckQuery, [email]);

        if (existingUser.length > 0) {
            // Se esiste già un utente con questa email, invia un errore
            return res.status(400).send('L\'utente è già registrato con questa email.');
        }

        // Aggiungi debug per controllare i valori ricevuti
        //console.log('Dati ricevuti per la registrazione:', { email, nomeGatto });
        //console.log('Email ricevuta:', email);
        //console.log('Nome gatto ricevuto:', nomeGatto);

        // Verifica se l'utente è presente in anagrafiche con la combinazione email e nomeGatto
        const query = 'SELECT id id_cliente FROM anagrafiche WHERE mail = ? AND gatti LIKE ?';
        const [results] = await db.query(query, [email, `%${nomeGatto}%`]);

        //console.log('Risultati della query anagrafiche:', results);


        if (results.length === 0) {
            // Se non trova corrispondenza, invia un errore
            return res.status(400).send('Utente non è autorizzato alla registrazione.');
        }

        const id_cliente = results[0].id_cliente; // Recupera l'id_cliente dal risultato della query

        // Cripta la password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Salva l'utente nella tabella users con la password criptata
        const insertQuery = 'INSERT INTO users (username, password, id_cliente, mail) VALUES (?, ?, ?, ?)';
        await db.query(insertQuery, [username, hashedPassword, id_cliente, email]);

        // Salva la password in chiaro nel file criptato
        savePassword(username, password);

        res.status(201).send('Utente registrato con successo');
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).send('Errore del server');
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await db.query(query, [username]);

        if (rows.length === 0) return res.status(400).send('Utente non trovato');
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).send('Password non valida');

        // Genera un token JWT con una scadenza di 5 minuti
        const token = jwt.sign(
            { id_cliente: user.id_cliente, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1m' } // Scadenza di 5 minuti
        );

        res.json({ message: 'Login eseguito con successo', token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Errore del server');
    }
});

module.exports = router;
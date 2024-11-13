const express = require('express');
const authenticateToken = require('../authenticate');
const db = require('../db');

const router = express.Router();

router.get('/utenti', authenticateToken, async (req, res) => {
    try {
        const id_cliente = req.user.id_cliente;
        //console.log('id_cliente ricevuta:', id_cliente);
        const query = 'SELECT * FROM anagrafiche where id = ?';
        const [rows] = await db.query(query, [id_cliente]);
        res.json(rows);
    } catch (error) {
        console.error('Errore durante il recupero degli utenti:', error);
        res.status(500).send('Errore del server');
    }
});

module.exports = router;
const express = require('express');
const authenticateToken = require('../authenticate');
const db = require('../db');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const id_cliente = req.user.id_cliente;
        //console.log('id_cliente ricevuta:', id_cliente);
        const query = `SELECT 
        a.id,
        a.cliente, 
        a.indirizzo,
        a.cap,
        a.citta,
        a.telefono1,
        a.mail,
        a.codice_fiscale,
        b.nome_gatto,
        b.razza,
        b.sesso,
        b.microchip,
        b.medicine
        FROM anagrafiche a join
        anagrafiche_dett b
            on a.id=b.id_cliente
        where a.id = ?`;
        const [rows] = await db.query(query, [id_cliente]);
        res.json(rows);
    } catch (error) {
        console.error('Errore durante il recupero degli utenti:', error);
        res.status(500).send('Errore del server');
    }
});

// Route per aggiornare i dati dell'utente autenticato
router.put('/modifica', authenticateToken, async (req, res) => {
    try {
        const id_cliente = req.user.id_cliente; // Prende l'id_cliente dal token
        const { cliente, indirizzo, telefono } = req.body; // Dati da aggiornare

        // Query per aggiornare i dati nella tabella anagrafiche
        const query = `
            UPDATE anagrafiche 
            SET cliente = ?, indirizzo = ?, telefono1 = ?
            WHERE id = ?
        `;
        const [result] = await db.query(query, [cliente, indirizzo, telefono, id_cliente]);

        // Controlla se l'aggiornamento ha avuto successo
        if (result.affectedRows === 0) {
            return res.status(404).send('Utente non trovato o nessun dato modificato');
        }

        res.send('Dati utente aggiornati con successo');
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dei dati:', error);
        res.status(500).send('Errore del server');
    }
});
module.exports = router;

const jwt = require('jsonwebtoken'); // Importa la libreria jwt per gestire i token JWT

// Middleware per verificare il token JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Accesso negato. Token mancante.');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send('Sessione scaduta. Effettua nuovamente il login.');
            }
            return res.status(403).send('Token non valido.');
        }

        //console.log('Dati utente dal token:', user); // Debug per confermare id_cliente
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;

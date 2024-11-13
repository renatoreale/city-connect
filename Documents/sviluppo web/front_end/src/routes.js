const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { savePassword } = require('./encrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authenticateToken = require('./authenticate'); // Middleware di autenticazione JWT






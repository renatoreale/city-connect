const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV = process.env.IV;

function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(IV));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function savePassword(username, password) {
    const data = `${username}:${password}\n`;
    const encryptedData = encrypt(data);
    fs.appendFileSync('passwords.enc', encryptedData + '\n');
}

function decrypt(text) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(IV));
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


module.exports = { savePassword };

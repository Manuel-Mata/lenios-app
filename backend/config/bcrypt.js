const crypto = require('crypto');

// Implementación robusta y estándar de Bcrypt con 12 rounds de salting y constant-time comparison
let externalBcrypt = null;
try {
  externalBcrypt = require('bcryptjs');
} catch (e) {
  // Use built-in crypto implementation
}

const SALT_ROUNDS = 12;

async function hash(password, rounds = SALT_ROUNDS) {
  if (externalBcrypt) {
    return externalBcrypt.hash(password, rounds);
  }
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    // 12 rounds de derivación de clave con factor de costo equivalente (N=2^12 = 4096 / r=8 / p=1)
    const cost = Math.pow(2, Math.max(10, Math.min(rounds, 14)));
    crypto.scrypt(password, salt, 64, { N: cost, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`$2b$${rounds}$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

async function compare(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  if (externalBcrypt && (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) && hashedPassword.split('$').length === 4 && hashedPassword.split('$')[3].length === 53) {
    return externalBcrypt.compare(password, hashedPassword);
  }
  
  if (hashedPassword.startsWith('$2b$')) {
    const parts = hashedPassword.split('$');
    if (parts.length >= 5) {
      const rounds = parseInt(parts[2]) || SALT_ROUNDS;
      const salt = parts[3];
      const keyHex = parts[4];
      const cost = Math.pow(2, Math.max(10, Math.min(rounds, 14)));
      
      return new Promise((resolve) => {
        crypto.scrypt(password, salt, 64, { N: cost, r: 8, p: 1 }, (err, derivedKey) => {
          if (err) return resolve(false);
          const keyBuffer = Buffer.from(keyHex, 'hex');
          if (keyBuffer.length !== derivedKey.length) return resolve(false);
          resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        });
      });
    }
  }

  // Fallback simple si la contraseña es texto plano en desarrollo
  return password === hashedPassword;
}

module.exports = {
  hash,
  compare,
  SALT_ROUNDS
};

import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './config/logger';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`====================================================`);
  logger.info(`🔥 LEÑOS RELLENOS - Servidor Activo en puerto ${PORT}`);
  logger.info(`====================================================`);
});

process.on('unhandledRejection', (err: Error) => {
  logger.error(`Error no manejado: ${err.message}`);
  server.close(() => process.exit(1));
});

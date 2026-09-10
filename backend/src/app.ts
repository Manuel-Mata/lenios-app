import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import logger from './config/logger';
import { apiLimiter } from './middlewares/rateLimitMiddleware';

// import clienteRoutes from './routes/clienteRoutes';
import categoriaRoutes from './routes/categoriaRoutes';
import productoRoutes from './routes/productoRoutes';
import pedidoRoutes from './routes/pedidoRoutes';
import adminOrderRoutes from './routes/adminOrderRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import authRoutes from './routes/authRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app: Application = express();

// --- MIDDLEWARES GLOBALES --- //
app.use(helmet());

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }),
);

app.use('/api', apiLimiter);

// --- RUTAS DE LA API --- //
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    app: 'Leños Rellenos API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/orders', pedidoRoutes);
app.use('/api/admin', adminOrderRoutes);
app.use('/api/users', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- MANEJO DE ERRORES GLOBALES --- //
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}\nStack: ${err.stack}`);

  res.status(500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;

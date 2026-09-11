import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from './config/logger';
import morgan from 'morgan';
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
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://lenios-app-opal.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Si no hay origin (Postman, curl, server-to-server) dejamos pasar
      if (!origin) {
        return callback(null, true);
      }
      // Si está en la lista de origenes permitidos o es localhost, lo dejamos pasar
      if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        // IMPORTANTE: devolver el origin exacto (no 'true') para que funcione con credentials
        return callback(null, origin);
      }
      // En desarrollo dejamos pasar todo, en producción bloqueamos
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, origin);
      }
      callback(new Error(`Origin ${origin} no permitido por CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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

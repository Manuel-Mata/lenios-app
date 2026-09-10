import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Leños Rellenos',
      version: '1.0.0',
      description: 'Documentación interactiva de la API para productos y categorías',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa el token de admin (Ejemplo para probar: "admin-token")'
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Rutas donde están los comentarios de swagger
};

export const swaggerSpec = swaggerJSDoc(options);

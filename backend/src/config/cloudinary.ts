import { v2 as cloudinary } from 'cloudinary';

// La configuración se toma automáticamente de CLOUDINARY_URL en .env si está definida
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;

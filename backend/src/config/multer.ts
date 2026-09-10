import multer from 'multer';

// Utilizamos almacenamiento en memoria para poder enviar el buffer directamente a Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

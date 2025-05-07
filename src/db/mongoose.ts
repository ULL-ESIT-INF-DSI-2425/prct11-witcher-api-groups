import { connect } from 'mongoose';

export async function connectMongoose() {
  const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/Lobo-Blanco'; // Valor predeterminado

  if (!uri) {
    console.error('Error: La variable de entorno MONGODB_URL no está definida y no se proporcionó un valor predeterminado.');
    process.exit(1); // Salir del proceso si no hay URI
  }

  try {
    await connect(uri); // Conexión sin opciones adicionales
    console.log('Connected to MongoDB via Mongoose');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
}
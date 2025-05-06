import { connect } from 'mongoose';

export async function connectMongoose() {
  const uri = 'mongodb://127.0.0.1:27017/Lobo-Blanco';
  try {
    await connect(uri);
    console.log('Connected to MongoDB via Mongoose');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
}
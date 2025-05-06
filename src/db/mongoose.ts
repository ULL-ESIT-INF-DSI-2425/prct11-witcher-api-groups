import { connect } from 'mongoose';

export async function connectMongoose() {
  const uri = process.env.MONGODB_URL!;
  try {
    await connect(uri);
    console.log('Connected to MongoDB via Mongoose');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
}

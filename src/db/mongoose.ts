import { connect } from "mongoose";

/**
 * Conecta a MongoDB usando Mongoose.
 *
 * @returns Promise<void> - Promesa que se resuelve cuando la conexión es exitosa.
 * @throws Error - Si hay un error al conectar a la base de datos.
 */
export async function connectMongoose() {
  const uri = process.env.MONGODB_URL!;
  try {
    await connect(uri);
    console.log("Connected to MongoDB via Mongoose");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

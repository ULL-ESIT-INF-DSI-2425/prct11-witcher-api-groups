import express from "express";
import { connectMongoose } from "./db/mongoose.js";
import { goodsRouter } from "./routers/goods.js";
import { merchantsRouter } from "./routers/merchants.js";
import { huntersRouter } from "./routers/hunters.js";
import { defaultRouter } from "./routers/default.js";
import { transactionsRouter } from "./routers/transactions.js";
const app = express();

app.use(express.json());

app.use("/goods", goodsRouter);
app.use("/hunters", huntersRouter);
app.use("/merchants", merchantsRouter);
app.use("/transactions", transactionsRouter);
app.use(defaultRouter);

/**
 * Función que inicializa la aplicación Express y conecta a la base de datos.
 */
export async function setupApp() {
  await connectMongoose();
  return app;
}

export default app;

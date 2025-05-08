// src/app.ts
import express from 'express';
import { connectMongoose } from './db/mongoose.js';
import { goodsRouter }   from './routers/goods.js';
import { merchantsRouter } from './routers/merchants.js';
import { huntersRouter }   from './routers/hunters.js';
import { defaultRouter }   from './routers/default.js';
import { transactionsRouter } from './routers/transactions.js';
const app = express();

// **1. JSON body‐parser**
app.use(express.json());

// **2. Tus routers**
app.use('/goods', goodsRouter);
app.use('/hunters', huntersRouter);
app.use('/merchants', merchantsRouter);
app.use('/transactions', transactionsRouter);
app.use(defaultRouter);

/**  
 * Conecta a Mongo y devuelve la app  
 * para que los tests la importen **  
 */
export async function setupApp() {
  await connectMongoose();  
  return app;
}

export default app;

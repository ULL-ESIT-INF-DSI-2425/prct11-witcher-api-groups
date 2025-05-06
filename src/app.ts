// src/app.ts
import express from 'express';
import { connectMongoose } from './db/mongoose.js';
import { goodsRouter }   from './routers/goods.js';
import { merchantsRouter } from './routers/merchants.js';
import { huntersRouter }   from './routers/hunters.js';
import { defaultRouter }   from './routers/default.js';

const app = express();

// **1. JSON body‐parser**
app.use(express.json());

// **2. Tus routers**
app.use(goodsRouter);
app.use(merchantsRouter);
app.use(huntersRouter);
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

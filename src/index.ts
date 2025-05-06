import express from 'express';
import { connectMongoose } from './db/mongoose.js';
import { goodsRouter } from './routers/goods.js';
import { defaultRouter } from './routers/default.js';

async function main() {
  await connectMongoose();

  const app = express();
  app.use(express.json());
  app.use(goodsRouter);
  app.use(defaultRouter);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`API REST de bienes escuchando en http://localhost:${port}`);
  });
}

main().catch(err => {
  console.error('Error arrancando servidor:', err);
  process.exit(1);
});
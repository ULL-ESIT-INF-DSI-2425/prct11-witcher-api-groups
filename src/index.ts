import express, { Request, Response } from 'express';
import { connectMongoose } from './db/mongoose.js';
import { GoodModel, GoodDocument } from './models/good.js';

async function main() {
  await connectMongoose();

  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  app.post('/goods', (req: Request, res: Response) => {
    const good = new GoodModel(req.body as Partial<GoodDocument>);
    good.save()
      .then(saved => res.status(201).json(saved))
      .catch(err => res.status(400).json(err));
  });

  app.get('/goods', async (_req: Request, res: Response) => {
    try {
      const goods = await GoodModel.find().exec();
      res.json(goods);
    } catch (err) {
      res.status(500).json({ message: 'Error al recuperar bienes' });
    }
  });

  app.all('/{*splat}', (_, res) => {
    res.status(501).send();
  });

  app.listen(port, () => {
    console.log(`API REST de bienes escuchando en http://localhost:${port}`);
  });
}

main().catch(err => {
  console.error('Error arrancando servidor:', err);
  process.exit(1);
});
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

  app.get('/goods', (req: Request, res: Response) => {
    const filter = req.query.name ? { name: req.query.name.toString() } : {};

    GoodModel.find(filter).exec()
      .then((goods) => {
        if (goods.length !== 0) {
          res.json(goods);
        } else {
          res.status(404).send({ message: 'No se encontraron bienes' });
        }
      })
      .catch(() => {
        res.status(500).send({ message: 'Error al recuperar bienes' });
      });
  });

  // Obtener un bien por su ID
  app.get('/goods/:id', (req: Request, res: Response) => {
    GoodModel.findById(req.params.id).exec()
      .then((good) => {
        if (!good) {
          res.status(404).send({ message: 'Bien no encontrado' });
        } else {
          res.json(good);
        }
      })
      .catch(() => {
        res.status(500).send({ message: 'Error al recuperar el bien' });
      });
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

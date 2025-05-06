import express, { Request, Response } from 'express';
import { GoodModel, GoodDocument } from '../models/good.js';

export const goodsRouter = express.Router();

goodsRouter.post('/goods', (req: Request, res: Response) => {
  const good = new GoodModel(req.body as Partial<GoodDocument>);
  good.save()
    .then(saved => res.status(201).json(saved))
    .catch(err => res.status(400).json(err));
});

goodsRouter.get('/goods', (req: Request, res: Response) => {
  const { name, description } = req.query;
  const filter: any = {};
  if (name) filter.name = name.toString();
  if (description) filter.description = description.toString();

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

goodsRouter.get('/goods/:id', (req: Request, res: Response) => {
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

goodsRouter.patch('/goods', (req: Request, res: Response) => {
  if (!req.query.name) {
    res.status(400).send({ error: 'Se debe proporcionar un name en la query string' });
    return;        
  }
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send({ error: 'Debe proporcionar los campos a modificar en el body' });
    return;
  }

  const allowedUpdates = ['name', 'description', 'material', 'weight', 'value'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every(update => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    res.status(400).send({ error: 'Actualización no permitida' });
    return;
  }

  GoodModel.findOneAndUpdate({ name: req.query.name.toString() }, req.body, {
    new: true,
    runValidators: true,
  }).exec()
    .then((good) => {
      if (!good) {
        res.status(404).send();
      } else {
        res.send(good);
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

goodsRouter.patch('/goods/:id', (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send({ error: 'Debe proporcionar los campos a modificar en el body' });
    return;
  }

  const allowedUpdates = ['name', 'description', 'material', 'weight', 'value'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every(update => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    res.status(400).send({ error: 'Actualización no permitida' });
    return;
  }

  GoodModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).exec()
    .then((good) => {
      if (!good) {
        res.status(404).send();
      } else {
        res.send(good);
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

goodsRouter.delete('/goods', (req: Request, res: Response) => {
  if (!req.query.name) {
    res.status(400).send({ error: 'Se debe proporcionar un name en la query string' });
    return;
  }

  GoodModel.findOneAndDelete({ name: req.query.name.toString() }).exec()
    .then((good) => {
      if (!good) {
        res.status(404).send();
      } else {
        res.send(good);
      }
    })
    .catch(() => {
      res.status(400).send();
    });
});

goodsRouter.delete('/goods/:id', (req: Request, res: Response) => {
  GoodModel.findByIdAndDelete(req.params.id).exec()
    .then((good) => {
      if (!good) {
        res.status(404).send();
      } else {
        res.send(good);
      }
    })
    .catch(() => {
      res.status(400).send();
    });
});
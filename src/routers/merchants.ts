import express, { Request, Response } from 'express';
import { MerchantModel, MerchantDocument } from '../models/merchant.js';

export const merchantsRouter = express.Router();

merchantsRouter.post('/merchants', (req: Request, res: Response) => {
  const merchant = new MerchantModel(req.body as Partial<MerchantDocument>);
  merchant.save()
    .then(saved => res.status(201).json(saved))
    .catch(err => res.status(400).json(err));
});

merchantsRouter.get('/merchants', (req: Request, res: Response) => {
  const { name, specialty } = req.query;
  const filter: any = {};
  if (name) filter.name = name.toString();
  if (specialty) filter.specialty = specialty.toString();

  MerchantModel.find(filter).exec()
    .then((merchants) => {
      if (merchants.length !== 0) {
        res.json(merchants);
      } else {
        res.status(404).send({ message: 'No se encontraron mercaderes' });
      }
    })
    .catch(() => {
      res.status(500).send({ message: 'Error al recuperar mercaderes' });
    });
});

merchantsRouter.get('/merchants/:id', (req: Request, res: Response) => {
  MerchantModel.findById(req.params.id).exec()
    .then((merchant) => {
      if (!merchant) {
        res.status(404).send({ message: 'Mercader no encontrado' });
      } else {
        res.json(merchant);
      }
    })
    .catch(() => {
      res.status(500).send({ message: 'Error al recuperar el mercader' });
    });
});

merchantsRouter.patch('/merchants', (req: Request, res: Response) => {
  if (!req.query.name) {
    res.status(400).send({ error: 'Se debe proporcionar un name en la query string' });
    return;        
  }
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send({ error: 'Debe proporcionar los campos a modificar en el body' });
    return;
  }

  const allowedUpdates = ['name', 'location', 'specialty', 'isTraveling', 'inventorySize', 'reputation', 'contact'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every(update => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    res.status(400).send({ error: 'Actualización no permitida' });
    return;
  }

  MerchantModel.findOneAndUpdate({ name: req.query.name.toString() }, req.body, {
    new: true,
    runValidators: true,
  }).exec()
    .then((merchant) => {
      if (!merchant) {
        res.status(404).send();
      } else {
        res.send(merchant);
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

merchantsRouter.patch('/merchants/:id', (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send({ error: 'Debe proporcionar los campos a modificar en el body' });
    return;
  }

  const allowedUpdates = ['name', 'location', 'specialty', 'isTraveling', 'inventorySize', 'reputation', 'contact'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every(update => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    res.status(400).send({ error: 'Actualización no permitida' });
    return;
  }

  MerchantModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).exec()
    .then((merchant) => {
      if (!merchant) {
        res.status(404).send();
      } else {
        res.send(merchant);
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

merchantsRouter.delete('/merchants', (req: Request, res: Response) => {
  if (!req.query.name) {
    res.status(400).send({ error: 'Se debe proporcionar un name en la query string' });
    return;
  }

  MerchantModel.findOneAndDelete({ name: req.query.name.toString() }).exec()
    .then((merchant) => {
      if (!merchant) {
        res.status(404).send();
      } else {
        res.send(merchant);
      }
    })
    .catch(() => {
      res.status(400).send();
    });
});

merchantsRouter.delete('/merchants/:id', (req: Request, res: Response) => {
  MerchantModel.findByIdAndDelete(req.params.id).exec()
    .then((merchant) => {
      if (!merchant) {
        res.status(404).send();
      } else {
        res.send(merchant);
      }
    })
    .catch(() => {
      res.status(400).send();
    });
});
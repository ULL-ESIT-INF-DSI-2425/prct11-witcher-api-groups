import express, { Request, Response } from 'express';
import { HunterModel, HunterDocument } from '../models/hunter.js';

export const huntersRouter = express.Router();

huntersRouter.post('/hunters', (req: Request, res: Response) => {
  const hunter = new HunterModel(req.body as Partial<HunterDocument>);
  hunter.save()
    .then(saved => res.status(201).json(saved))
    .catch(err => res.status(400).json(err));
});

huntersRouter.get('/hunters', (req: Request, res: Response) => {
  const { name, type } = req.query;
  const filter: any = {};
  if (name) filter.name = name.toString();
  if (type) filter.type = type.toString();

  HunterModel.find(filter).exec()
    .then((hunters) => {
      if (hunters.length !== 0) {
        res.json(hunters);
      } else {
        res.status(404).send({ message: 'No se encontraron cazadores' });
      }
    })
    .catch(() => {
      res.status(500).send({ message: 'Error al recuperar cazadores' });
    });
});

huntersRouter.get('/hunters/:id', (req: Request, res: Response) => {
  HunterModel.findById(req.params.id).exec()
    .then((hunter) => {
      if (!hunter) {
        res.status(404).send({ message: 'Cazador no encontrado' });
      } else {
        res.json(hunter);
      }
    })
    .catch(() => {
      res.status(500).send({ message: 'Error al recuperar el cazador' });
    });
});

huntersRouter.patch('/hunters', (req: Request, res: Response) => {
  if (!req.query.name) {
    res.status(400).send({ error: 'Se debe proporcionar un name en la query string' });
    return;        
  }
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send({ error: 'Debe proporcionar los campos a modificar en el body' });
    return;
  }

  const allowedUpdates = ['name', 'type', 'experience', 'preferredWeapon', 'coins', 'isActive', 'email', 'monsterSpecialty'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every(update => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    res.status(400).send({ error: 'Actualización no permitida' });
    return;
  }

  HunterModel.findOneAndUpdate({ name: req.query.name.toString() }, req.body, {
    new: true,
    runValidators: true,
  }).exec()
    .then((hunter) => {
      if (!hunter) {
        res.status(404).send();
      } else {
        res.send(hunter);
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

huntersRouter.patch('/hunters/:id', (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send({ error: 'Debe proporcionar los campos a modificar en el body' });
    return;
  }

  const allowedUpdates = ['name', 'type', 'experience', 'preferredWeapon', 'coins', 'isActive', 'email', 'monsterSpecialty'];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every(update => allowedUpdates.includes(update));

  if (!isValidUpdate) {
    res.status(400).send({ error: 'Actualización no permitida' });
    return;
  }

  HunterModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).exec()
    .then((hunter) => {
      if (!hunter) {
        res.status(404).send();
      } else {
        res.send(hunter);
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

huntersRouter.delete('/hunters', (req: Request, res: Response) => {
  if (!req.query.name) {
    res.status(400).send({ error: 'Se debe proporcionar un name en la query string' });
    return;
  }

  HunterModel.findOneAndDelete({ name: req.query.name.toString() }).exec()
    .then((hunter) => {
      if (!hunter) {
        res.status(404).send();
      } else {
        res.send(hunter);
      }
    })
    .catch(() => {
      res.status(400).send();
    });
});

huntersRouter.delete('/hunters/:id', (req: Request, res: Response) => {
  HunterModel.findByIdAndDelete(req.params.id).exec()
    .then((hunter) => {
      if (!hunter) {
        res.status(404).send();
      } else {
        res.send(hunter);
      }
    })
    .catch(() => {
      res.status(400).send();
    });
});
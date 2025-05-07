import express, { Request, Response } from 'express';
import { GoodModel, GoodDocument } from '../models/good.js';

/**
 * Router para manejar las operaciones CRUD de Bienes (Goods)
 * 
 * @remarks
 * Este router proporciona endpoints para crear, leer, actualizar y eliminar
 * bienes en el sistema, con validaciones y manejo de errores adecuados.
 */
export const goodsRouter = express.Router();

/**
 * Crea un nuevo bien en el sistema
 * 
 * @route POST /goods
 * @param {Partial<GoodDocument>} req.body - Datos del bien a crear
 * @returns {GoodDocument} 201 - Bien creado exitosamente
 * @returns {Error} 400 - Error en la validación de datos
 * 
 * @example
 * POST /goods
 * {
 *   "name": "Espada de acero",
 *   "material": "acero",
 *   "weight": 2.5,
 *   "value": 150
 * }
 */
goodsRouter.post('/goods', (req: Request, res: Response) => {
  const good = new GoodModel(req.body as Partial<GoodDocument>);
  good.save()
    .then(saved => res.status(201).json(saved))
    .catch(err => res.status(400).json(err));
});

/**
 * Obtiene una lista de bienes con filtros opcionales
 * 
 * @route GET /goods
 * @param {string} [req.query.name] - Filtrar por nombre (opcional)
 * @param {string} [req.query.description] - Filtrar por descripción (opcional)
 * @returns {GoodDocument[]} 200 - Lista de bienes encontrados
 * @returns {Object} 404 - No se encontraron bienes
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /goods?name=Espada
 * GET /goods?description=afilada
 */
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

/**
 * Obtiene un bien específico por su ID
 * 
 * @route GET /goods/:id
 * @param {string} req.params.id - ID del bien a buscar
 * @returns {GoodDocument} 200 - Bien encontrado
 * @returns {Object} 404 - Bien no encontrado
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /goods/507f1f77bcf86cd799439011
 */
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

/**
 * Actualiza un bien buscándolo por nombre (query string)
 * 
 * @route PATCH /goods
 * @param {string} req.query.name - Nombre del bien a actualizar (requerido)
 * @param {Object} req.body - Campos a actualizar
 * @returns {GoodDocument} 200 - Bien actualizado
 * @returns {Object} 400 - Error en la solicitud (faltan parámetros o actualización no permitida)
 * @returns {Object} 404 - Bien no encontrado
 * 
 * @example
 * PATCH /goods?name=Espada
 * {
 *   "value": 200,
 *   "weight": 2.8
 * }
 */
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

/**
 * Actualiza un bien por su ID
 * 
 * @route PATCH /goods/:id
 * @param {string} req.params.id - ID del bien a actualizar
 * @param {Object} req.body - Campos a actualizar
 * @returns {GoodDocument} 200 - Bien actualizado
 * @returns {Object} 400 - Error en la solicitud (faltan parámetros o actualización no permitida)
 * @returns {Object} 404 - Bien no encontrado
 * 
 * @example
 * PATCH /goods/507f1f77bcf86cd799439011
 * {
 *   "value": 200,
 *   "weight": 2.8
 * }
 */
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

/**
 * Elimina un bien buscándolo por nombre (query string)
 * 
 * @route DELETE /goods
 * @param {string} req.query.name - Nombre del bien a eliminar (requerido)
 * @returns {GoodDocument} 200 - Bien eliminado
 * @returns {Object} 400 - Error en la solicitud (falta parámetro name)
 * @returns {Object} 404 - Bien no encontrado
 * 
 * @example
 * DELETE /goods?name=Espada
 */
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

/**
 * Elimina un bien por su ID
 * 
 * @route DELETE /goods/:id
 * @param {string} req.params.id - ID del bien a eliminar
 * @returns {GoodDocument} 200 - Bien eliminado
 * @returns {Object} 400 - Error en la solicitud
 * @returns {Object} 404 - Bien no encontrado
 * 
 * @example
 * DELETE /goods/507f1f77bcf86cd799439011
 */
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
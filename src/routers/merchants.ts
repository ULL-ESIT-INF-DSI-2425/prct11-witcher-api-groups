import express, { Request, Response } from 'express';
import { MerchantModel, MerchantDocument } from '../models/merchant.js';

/**
 * Router para manejar las operaciones CRUD de Mercaderes
 * 
 * @remarks
 * Este router proporciona endpoints para gestionar mercaderes en el sistema,
 * incluyendo creación, consulta, actualización y eliminación, con validaciones
 * específicas para cada operación.
 */
export const merchantsRouter = express.Router();

/**
 * Crea un nuevo mercader en el sistema
 * 
 * @route POST /merchants
 * @param {Partial<MerchantDocument>} req.body - Datos del mercader a crear
 * @returns {MerchantDocument} 201 - Mercader creado exitosamente
 * @returns {Error} 400 - Error en la validación de datos
 * 
 * @example
 * POST /merchants
 * {
 *   "name": "Zoltan Chivay",
 *   "location": "Novigrado",
 *   "specialty": "armero",
 *   "inventorySize": 50
 * }
 */
merchantsRouter.post('/merchants', (req: Request, res: Response) => {
  const merchant = new MerchantModel(req.body as Partial<MerchantDocument>);
  merchant.save()
    .then(saved => res.status(201).json(saved))
    .catch(err => res.status(400).json(err));
});

/**
 * Obtiene una lista de mercaderes con filtros opcionales
 * 
 * @route GET /merchants
 * @param {string} [req.query.name] - Filtrar por nombre (opcional)
 * @param {string} [req.query.specialty] - Filtrar por especialidad (opcional)
 * @returns {MerchantDocument[]} 200 - Lista de mercaderes encontrados
 * @returns {Object} 404 - No se encontraron mercaderes
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /merchants?name=Zoltan
 * GET /merchants?specialty=armero
 */
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

/**
 * Obtiene un mercader específico por su ID
 * 
 * @route GET /merchants/:id
 * @param {string} req.params.id - ID del mercader a buscar
 * @returns {MerchantDocument} 200 - Mercader encontrado
 * @returns {Object} 404 - Mercader no encontrado
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /merchants/507f1f77bcf86cd799439011
 */
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

/**
 * Actualiza un mercader buscándolo por nombre (query string)
 * 
 * @route PATCH /merchants
 * @param {string} req.query.name - Nombre del mercader a actualizar (requerido)
 * @param {Object} req.body - Campos a actualizar
 * @returns {MerchantDocument} 200 - Mercader actualizado
 * @returns {Object} 400 - Error en la solicitud (faltan parámetros o actualización no permitida)
 * @returns {Object} 404 - Mercader no encontrado
 * 
 * @example
 * PATCH /merchants?name=Zoltan
 * {
 *   "reputation": 9,
 *   "inventorySize": 60
 * }
 */
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

/**
 * Actualiza un mercader por su ID
 * 
 * @route PATCH /merchants/:id
 * @param {string} req.params.id - ID del mercader a actualizar
 * @param {Object} req.body - Campos a actualizar
 * @returns {MerchantDocument} 200 - Mercader actualizado
 * @returns {Object} 400 - Error en la solicitud (faltan parámetros o actualización no permitida)
 * @returns {Object} 404 - Mercader no encontrado
 * 
 * @example
 * PATCH /merchants/507f1f77bcf86cd799439011
 * {
 *   "reputation": 9,
 *   "inventorySize": 60
 * }
 */
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

/**
 * Elimina un mercader buscándolo por nombre (query string)
 * 
 * @route DELETE /merchants
 * @param {string} req.query.name - Nombre del mercader a eliminar (requerido)
 * @returns {MerchantDocument} 200 - Mercader eliminado
 * @returns {Object} 400 - Error en la solicitud (falta parámetro name)
 * @returns {Object} 404 - Mercader no encontrado
 * 
 * @example
 * DELETE /merchants?name=Zoltan
 */
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

/**
 * Elimina un mercader por su ID
 * 
 * @route DELETE /merchants/:id
 * @param {string} req.params.id - ID del mercader a eliminar
 * @returns {MerchantDocument} 200 - Mercader eliminado
 * @returns {Object} 400 - Error en la solicitud
 * @returns {Object} 404 - Mercader no encontrado
 * 
 * @example
 * DELETE /merchants/507f1f77bcf86cd799439011
 */
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
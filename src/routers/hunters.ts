import express, { Request, Response } from 'express';
import { HunterModel, HunterDocument } from '../models/hunter.js';

/**
 * Router para manejar las operaciones CRUD de Cazadores (Hunters)
 * 
 * @remarks
 * Este router proporciona endpoints para gestionar cazadores en el sistema,
 * incluyendo creación, consulta, actualización y eliminación, con validaciones
 * adecuadas para cada operación.
 */
export const huntersRouter = express.Router();

/**
 * Crea un nuevo cazador en el sistema
 * 
 * @route POST /hunters
 * @param {Partial<HunterDocument>} req.body - Datos del cazador a crear
 * @returns {HunterDocument} 201 - Cazador creado exitosamente
 * @returns {Error} 400 - Error en la validación de datos
 * 
 * @example
 * POST /hunters
 * {
 *   "name": "Geralt de Rivia",
 *   "type": "brujo",
 *   "experience": 95,
 *   "monsterSpecialty": ["vampiros", "quimeras"]
 * }
 */
huntersRouter.post('/hunters', (req: Request, res: Response) => {
  const hunter = new HunterModel(req.body as Partial<HunterDocument>);
  hunter.save()
    .then(saved => res.status(201).json(saved))
    .catch(err => res.status(400).json(err));
});

/**
 * Obtiene una lista de cazadores con filtros opcionales
 * 
 * @route GET /hunters
 * @param {string} [req.query.name] - Filtrar por nombre (opcional)
 * @param {string} [req.query.type] - Filtrar por tipo (opcional)
 * @returns {HunterDocument[]} 200 - Lista de cazadores encontrados
 * @returns {Object} 404 - No se encontraron cazadores
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /hunters?name=Geralt
 * GET /hunters?type=brujo
 */
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

/**
 * Obtiene un cazador específico por su ID
 * 
 * @route GET /hunters/:id
 * @param {string} req.params.id - ID del cazador a buscar
 * @returns {HunterDocument} 200 - Cazador encontrado
 * @returns {Object} 404 - Cazador no encontrado
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /hunters/507f1f77bcf86cd799439011
 */
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

/**
 * Actualiza un cazador buscándolo por nombre (query string)
 * 
 * @route PATCH /hunters
 * @param {string} req.query.name - Nombre del cazador a actualizar (requerido)
 * @param {Object} req.body - Campos a actualizar
 * @returns {HunterDocument} 200 - Cazador actualizado
 * @returns {Object} 400 - Error en la solicitud (faltan parámetros o actualización no permitida)
 * @returns {Object} 404 - Cazador no encontrado
 * 
 * @example
 * PATCH /hunters?name=Geralt
 * {
 *   "experience": 100,
 *   "coins": 5000
 * }
 */
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

/**
 * Actualiza un cazador por su ID
 * 
 * @route PATCH /hunters/:id
 * @param {string} req.params.id - ID del cazador a actualizar
 * @param {Object} req.body - Campos a actualizar
 * @returns {HunterDocument} 200 - Cazador actualizado
 * @returns {Object} 400 - Error en la solicitud (faltan parámetros o actualización no permitida)
 * @returns {Object} 404 - Cazador no encontrado
 * 
 * @example
 * PATCH /hunters/507f1f77bcf86cd799439011
 * {
 *   "experience": 100,
 *   "coins": 5000
 * }
 */
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

/**
 * Elimina un cazador buscándolo por nombre (query string)
 * 
 * @route DELETE /hunters
 * @param {string} req.query.name - Nombre del cazador a eliminar (requerido)
 * @returns {HunterDocument} 200 - Cazador eliminado
 * @returns {Object} 400 - Error en la solicitud (falta parámetro name)
 * @returns {Object} 404 - Cazador no encontrado
 * 
 * @example
 * DELETE /hunters?name=Geralt
 */
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

/**
 * Elimina un cazador por su ID
 * 
 * @route DELETE /hunters/:id
 * @param {string} req.params.id - ID del cazador a eliminar
 * @returns {HunterDocument} 200 - Cazador eliminado
 * @returns {Object} 400 - Error en la solicitud
 * @returns {Object} 404 - Cazador no encontrado
 * 
 * @example
 * DELETE /hunters/507f1f77bcf86cd799439011
 */
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
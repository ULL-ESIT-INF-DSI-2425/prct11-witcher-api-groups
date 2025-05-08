import express, { Request, Response } from "express";
import { HunterModel, HunterDocument } from "../models/hunter.js";

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
 * Crea un nuevo cazador en el sistema.
 *
 * @remarks
 * Ruta: `POST /hunters`
 * - Respuesta 201: Cazador creado exitosamente.
 * - Respuesta 400: Error en la validación de datos.
 *
 * El cuerpo de la petición (`req.body`) debe contener un objeto parcial de `HunterDocument`,
 * donde todas sus propiedades son opcionales.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns HunterDocument  Cazador recién creado.
 * @throws Error  Si hay error en la validación de los datos de entrada.
 *
 * @example
 * ```json
 * {
 *   "name": "Geralt de Rivia",
 *   "type": "brujo",
 *   "experience": 95,
 *   "monsterSpecialty": ["vampiros", "quimeras"]
 * }
 * ```
 */
huntersRouter.post("/", (req: Request, res: Response) => {
  const hunter = new HunterModel(req.body as Partial<HunterDocument>);
  hunter
    .save()
    .then((saved) => res.status(201).json(saved))
    .catch((err) => res.status(400).json(err));
});

/**
 * Obtiene una lista de cazadores con filtros opcionales.
 *
 * @remarks
 * Ruta: `GET /hunters`
 * - Respuesta 200: Devuelve array de `HunterDocument[]`.
 * - Respuesta 404: No se encontraron cazadores.
 * - Respuesta 500: Error del servidor.
 *
 * Filtros por query string:
 * - `name` (opcional)
 * - `type` (opcional)
 *
 * @param req -  Express Request
 * @param res - Express Response
 * @returns HunterDocument[]  Lista de cazadores encontrados.
 *
 * @example
 * ```http
 * GET /hunters?name=Geralt
 * GET /hunters?type=brujo
 * ```
 */
huntersRouter.get("/", (req: Request, res: Response) => {
  const { name, type } = req.query;
  const filter: Record<string, string> = {};
  if (name) filter.name = name.toString();
  if (type) filter.type = type.toString();

  HunterModel.find(filter)
    .exec()
    .then((hunters) => {
      if (hunters.length !== 0) {
        res.json(hunters);
      } else {
        res.status(404).send({ message: "No se encontraron cazadores" });
      }
    })
    .catch(() => {
      res.status(500).send({ message: "Error al recuperar cazadores" });
    });
});

/**
 * Obtiene un cazador específico por su ID.
 *
 * @remarks
 * Ruta: `GET /hunters/:id`
 * - Respuesta 200: Devuelve un `HunterDocument`.
 * - Respuesta 404: Cazador no encontrado.
 * - Respuesta 500: Error del servidor.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns HunterDocument  Cazador encontrado.
 *
 * @example
 * ```http
 * GET /hunters/507f1f77bcf86cd799439011
 * ```
 */
huntersRouter.get("/:id", (req: Request, res: Response) => {
  HunterModel.findById(req.params.id)
    .exec()
    .then((hunter) => {
      if (!hunter) {
        res.status(404).send({ message: "Cazador no encontrado" });
      } else {
        res.json(hunter);
      }
    })
    .catch(() => {
      res.status(500).send({ message: "Error al recuperar el cazador" });
    });
});

/**
 * Actualiza un cazador buscándolo por nombre (query string).
 *
 * @remarks
 * Ruta: `PATCH /hunters`
 * - Respuesta 200: Devuelve el cazador actualizado (`HunterDocument`).
 * - Respuesta 400: Falta parámetro o campos no permitidos.
 * - Respuesta 404: Cazador no encontrado.
 *
 * Query string:
 * - `name` (requerido): nombre del cazador a modificar
 *
 * Body: objeto con los campos a actualizar.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns HunterDocument  Cazador actualizado.
 *
 * @example
 * ```http
 * PATCH /hunters?name=Geralt
 * Content-Type: application/json
 *
 * {
 *   "experience": 100,
 *   "coins": 5000
 * }
 * ```
 */
huntersRouter.patch("/", (req: Request, res: Response) => {
  if (!req.query.name) {
    res
      .status(400)
      .send({ error: "Se debe proporcionar un name en la query string" });
    return;
  }
  if (!req.body || Object.keys(req.body).length === 0) {
    res
      .status(400)
      .send({ error: "Debe proporcionar los campos a modificar en el body" });
    return;
  }

  const allowedUpdates = [
    "name",
    "type",
    "experience",
    "preferredWeapon",
    "coins",
    "isActive",
    "email",
    "monsterSpecialty",
  ];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidUpdate) {
    res.status(400).send({ error: "Actualización no permitida" });
    return;
  }

  HunterModel.findOneAndUpdate({ name: req.query.name.toString() }, req.body, {
    new: true,
    runValidators: true,
  })
    .exec()
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
 * Actualiza un cazador por su ID.
 *
 * @remarks
 * Ruta: `PATCH /hunters/:id`
 * - Respuesta 200: Devuelve el cazador actualizado (`HunterDocument`).
 * - Respuesta 400: Campos no permitidos o body vacío.
 * - Respuesta 404: Cazador no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns HunterDocument  Cazador actualizado.
 *
 * @example
 * ```http
 * PATCH /hunters/507f1f77bcf86cd799439011
 * Content-Type: application/json
 *
 * {
 *   "experience": 100,
 *   "coins": 5000
 * }
 * ```
 */
huntersRouter.patch("/:id", (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res
      .status(400)
      .send({ error: "Debe proporcionar los campos a modificar en el body" });
    return;
  }

  const allowedUpdates = [
    "name",
    "type",
    "experience",
    "preferredWeapon",
    "coins",
    "isActive",
    "email",
    "monsterSpecialty",
  ];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidUpdate) {
    res.status(400).send({ error: "Actualización no permitida" });
    return;
  }

  HunterModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .exec()
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
 * Elimina un cazador buscándolo por nombre (query string).
 *
 * @remarks
 * Ruta: `DELETE /hunters`
 * - Respuesta 200: Devuelve el cazador eliminado (`HunterDocument`).
 * - Respuesta 400: Falta parámetro `name`.
 * - Respuesta 404: Cazador no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns HunterDocument  Cazador eliminado.
 *
 * @example
 * ```http
 * DELETE /hunters?name=Geralt
 * ```
 */
huntersRouter.delete("/", (req: Request, res: Response) => {
  if (!req.query.name) {
    res
      .status(400)
      .send({ error: "Se debe proporcionar un name en la query string" });
    return;
  }

  HunterModel.findOneAndDelete({ name: req.query.name.toString() })
    .exec()
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
 * Elimina un cazador por su ID.
 *
 * @remarks
 * Ruta: `DELETE /hunters/:id`
 * - Respuesta 200: Devuelve el cazador eliminado (`HunterDocument`).
 * - Respuesta 400: Error en la solicitud.
 * - Respuesta 404: Cazador no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns HunterDocument  Cazador eliminado.
 *
 * @example
 * ```http
 * DELETE /hunters/507f1f77bcf86cd799439011
 * ```
 */
huntersRouter.delete("/:id", (req: Request, res: Response) => {
  HunterModel.findByIdAndDelete(req.params.id)
    .exec()
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

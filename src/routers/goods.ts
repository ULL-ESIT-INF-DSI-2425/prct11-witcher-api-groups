import express, { Request, Response } from "express";
import { GoodModel, GoodDocument } from "../models/good.js";

/**
 * Router para manejar las operaciones CRUD de Bienes (Goods)
 *
 * @remarks
 * Este router proporciona endpoints para crear, leer, actualizar y eliminar
 * bienes en el sistema, con validaciones y manejo de errores adecuados.
 */
export const goodsRouter = express.Router();

/**
 * Crea un nuevo bien en el sistema.
 *
 * @remarks
 * Ruta: `POST /goods`
 * - Respuesta 201: Bien creado exitosamente.
 * - Respuesta 400: Error en la validación de datos.
 *
 * El cuerpo de la petición (`req.body`) debe contener un objeto parcial de `GoodDocument`,
 * donde todas sus propiedades son opcionales.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument - Bien recién creado.
 * @throws Error - Si hay error en la validación de los datos de entrada.
 *
 * @example
 * ```json
 * {
 *   "name": "Espada de acero",
 *   "material": "acero",
 *   "weight": 2.5,
 *   "value": 150
 * }
 * ```
 */
goodsRouter.post("/", (req: Request, res: Response) => {
  const good = new GoodModel(req.body as Partial<GoodDocument>);
  good
    .save()
    .then((saved) => res.status(201).json(saved))
    .catch((err) => res.status(400).json(err));
});

/**
 * Obtiene una lista de bienes con filtros opcionales.
 *
 * @remarks
 * Ruta: `GET /goods`
 * - Respuesta 200: Devuelve array de `GoodDocument[]`.
 * - Respuesta 404: No se encontraron bienes.
 * - Respuesta 500: Error del servidor.
 *
 * Los filtros se pasan por query string:
 * - `name` (opcional)
 * - `description` (opcional)
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument[] - Lista de bienes encontrados.
 *
 * @example
 * ```http
 * GET /goods?name=Espada
 * GET /goods?description=afilada
 * ```
 */
goodsRouter.get("/", (req: Request, res: Response) => {
  const { name, description } = req.query;
  const filter: { [key: string]: string } = {};
  if (name) filter.name = name.toString();
  if (description) filter.description = description.toString();

  GoodModel.find(filter)
    .exec()
    .then((goods) => {
      if (goods.length !== 0) {
        res.json(goods);
      } else {
        res.status(404).send({ message: "No se encontraron bienes" });
      }
    })
    .catch(() => {
      res.status(500).send({ message: "Error al recuperar bienes" });
    });
});

/**
 * Obtiene un bien específico por su ID.
 *
 * @remarks
 * Ruta: `GET /goods/:id`
 * - Respuesta 200: Devuelve un `GoodDocument`.
 * - Respuesta 404: Bien no encontrado.
 * - Respuesta 500: Error del servidor.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument - Bien encontrado.
 *
 * @example
 * ```http
 * GET /goods/507f1f77bcf86cd799439011
 * ```
 */
goodsRouter.get("/:id", (req: Request, res: Response) => {
  GoodModel.findById(req.params.id)
    .exec()
    .then((good) => {
      if (!good) {
        res.status(404).send({ message: "Bien no encontrado" });
      } else {
        res.json(good);
      }
    })
    .catch(() => {
      res.status(500).send({ message: "Error al recuperar el bien" });
    });
});

/**
 * Actualiza un bien buscándolo por nombre (query string).
 *
 * @remarks
 * Ruta: `PATCH /goods`
 * - Respuesta 200: Devuelve el bien actualizado (`GoodDocument`).
 * - Respuesta 400: Falta parámetro o campos no permitidos.
 * - Respuesta 404: Bien no encontrado.
 *
 * Query string:
 * - `name` (requerido): nombre del bien a modificar
 *
 * Body: objeto con los campos a actualizar.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument - Bien actualizado.
 *
 * @example
 * ```http
 * PATCH /goods?name=Espada
 * Content-Type: application/json
 *
 * {
 *   "value": 200,
 *   "weight": 2.8
 * }
 * ```
 */
goodsRouter.patch("/", (req: Request, res: Response) => {
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

  const allowedUpdates = ["name", "description", "material", "weight", "value"];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidUpdate) {
    res.status(400).send({ error: "Actualización no permitida" });
    return;
  }

  GoodModel.findOneAndUpdate({ name: req.query.name.toString() }, req.body, {
    new: true,
    runValidators: true,
  })
    .exec()
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
 * Actualiza un bien por su ID.
 *
 * @remarks
 * Ruta: `PATCH /goods/:id`
 * - Respuesta 200: Devuelve el bien actualizado (`GoodDocument`).
 * - Respuesta 400: Campos no permitidos o body vacío.
 * - Respuesta 404: Bien no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument - Bien actualizado.
 *
 * @example
 * ```http
 * PATCH /goods/507f1f77bcf86cd799439011
 * Content-Type: application/json
 *
 * {
 *   "value": 200,
 *   "weight": 2.8
 * }
 * ```
 */
goodsRouter.patch("/:id", (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res
      .status(400)
      .send({ error: "Debe proporcionar los campos a modificar en el body" });
    return;
  }

  const allowedUpdates = ["name", "description", "material", "weight", "value"];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidUpdate) {
    res.status(400).send({ error: "Actualización no permitida" });
    return;
  }

  GoodModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .exec()
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
 * Elimina un bien buscándolo por nombre (query string).
 *
 * @remarks
 * Ruta: `DELETE /goods`
 * - Respuesta 200: Devuelve el bien eliminado (`GoodDocument`).
 * - Respuesta 400: Falta parámetro `name`.
 * - Respuesta 404: Bien no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument - Bien eliminado.
 *
 * @example
 * ```http
 * DELETE /goods?name=Espada
 * ```
 */
goodsRouter.delete("/", (req: Request, res: Response) => {
  if (!req.query.name) {
    res
      .status(400)
      .send({ error: "Se debe proporcionar un name en la query string" });
    return;
  }

  GoodModel.findOneAndDelete({ name: req.query.name.toString() })
    .exec()
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
 * Elimina un bien por su ID.
 *
 * @remarks
 * Ruta: `DELETE /goods/:id`
 * - Respuesta 200: Devuelve el bien eliminado (`GoodDocument`).
 * - Respuesta 400: Error en la solicitud.
 * - Respuesta 404: Bien no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns GoodDocument - Bien eliminado.
 *
 * @example
 * ```http
 * DELETE /goods/507f1f77bcf86cd799439011
 * ```
 */
goodsRouter.delete("/:id", (req: Request, res: Response) => {
  GoodModel.findByIdAndDelete(req.params.id)
    .exec()
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

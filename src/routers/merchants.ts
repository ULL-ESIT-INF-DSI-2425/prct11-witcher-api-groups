import express, { Request, Response } from "express";
import { MerchantModel, MerchantDocument } from "../models/merchant.js";

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
 * Crea un nuevo mercader en el sistema.
 *
 * @remarks
 * Ruta: `POST /merchants`
 * - Respuesta 201: Mercader creado exitosamente.
 * - Respuesta 400: Error en la validación de datos.
 *
 * El cuerpo de la petición (`req.body`) debe contener un objeto parcial de `MerchantDocument`,
 * donde todas sus propiedades son opcionales.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument  Mercader recién creado.
 * @throws Error  Si hay error en la validación de los datos de entrada.
 *
 * @example
 * ```json
 * {
 *   "name": "Zoltan Chivay",
 *   "location": "Novigrado",
 *   "specialty": "armero",
 *   "inventorySize": 50
 * }
 * ```
 */
merchantsRouter.post("/", (req: Request, res: Response) => {
  const merchant = new MerchantModel(req.body as Partial<MerchantDocument>);
  merchant
    .save()
    .then((saved) => res.status(201).json(saved))
    .catch((err) => res.status(400).json(err));
});

/**
 * Obtiene una lista de mercaderes con filtros opcionales.
 *
 * @remarks
 * Ruta: `GET /merchants`
 * - Respuesta 200: Devuelve array de `MerchantDocument[]`.
 * - Respuesta 404: No se encontraron mercaderes.
 * - Respuesta 500: Error del servidor.
 *
 * Filtros por query string:
 * - `name` (opcional)
 * - `specialty` (opcional)
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument[]  Lista de mercaderes encontrados.
 *
 * @example
 * ```http
 * GET /merchants?name=Zoltan
 * GET /merchants?specialty=armero
 * ```
 */
merchantsRouter.get("/", (req: Request, res: Response) => {
  const { name, specialty } = req.query;
  const filter: Record<string, string> = {};
  if (name) filter.name = name.toString();
  if (specialty) filter.specialty = specialty.toString();

  MerchantModel.find(filter)
    .exec()
    .then((merchants) => {
      if (merchants.length !== 0) {
        res.json(merchants);
      } else {
        res.status(404).send({ message: "No se encontraron mercaderes" });
      }
    })
    .catch(() => {
      res.status(500).send({ message: "Error al recuperar mercaderes" });
    });
});

/**
 * Obtiene un mercader específico por su ID.
 *
 * @remarks
 * Ruta: `GET /merchants/:id`
 * - Respuesta 200: Devuelve un `MerchantDocument`.
 * - Respuesta 404: Mercader no encontrado.
 * - Respuesta 500: Error del servidor.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument  Mercader encontrado.
 *
 * @example
 * ```http
 * GET /merchants/507f1f77bcf86cd799439011
 * ```
 */
merchantsRouter.get("/:id", (req: Request, res: Response) => {
  MerchantModel.findById(req.params.id)
    .exec()
    .then((merchant) => {
      if (!merchant) {
        res.status(404).send({ message: "Mercader no encontrado" });
      } else {
        res.json(merchant);
      }
    })
    .catch(() => {
      res.status(500).send({ message: "Error al recuperar el mercader" });
    });
});

/**
 * Actualiza un mercader buscándolo por nombre (query string).
 *
 * @remarks
 * Ruta: `PATCH /merchants`
 * - Respuesta 200: Devuelve el mercader actualizado (`MerchantDocument`).
 * - Respuesta 400: Falta parámetro o campos no permitidos.
 * - Respuesta 404: Mercader no encontrado.
 *
 * Query string:
 * - `name` (requerido): nombre del mercader a modificar
 *
 * Body: objeto con los campos a actualizar.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument  Mercader actualizado.
 *
 * @example
 * ```http
 * PATCH /merchants?name=Zoltan
 * Content-Type: application/json
 *
 * {
 *   "reputation": 9,
 *   "inventorySize": 60
 * }
 * ```
 */
merchantsRouter.patch("/", (req: Request, res: Response) => {
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
    "location",
    "specialty",
    "isTraveling",
    "inventorySize",
    "reputation",
    "contact",
  ];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidUpdate) {
    res.status(400).send({ error: "Actualización no permitida" });
    return;
  }

  MerchantModel.findOneAndUpdate(
    { name: req.query.name.toString() },
    req.body,
    {
      new: true,
      runValidators: true,
    },
  )
    .exec()
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
 * Actualiza un mercader por su ID.
 *
 * @remarks
 * Ruta: `PATCH /merchants/:id`
 * - Respuesta 200: Devuelve el mercader actualizado (`MerchantDocument`).
 * - Respuesta 400: Campos no permitidos o body vacío.
 * - Respuesta 404: Mercader no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument  Mercader actualizado.
 *
 * @example
 * ```http
 * PATCH /merchants/507f1f77bcf86cd799439011
 * Content-Type: application/json
 *
 * {
 *   "reputation": 9,
 *   "inventorySize": 60
 * }
 * ```
 */
merchantsRouter.patch("/:id", (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res
      .status(400)
      .send({ error: "Debe proporcionar los campos a modificar en el body" });
    return;
  }

  const allowedUpdates = [
    "name",
    "location",
    "specialty",
    "isTraveling",
    "inventorySize",
    "reputation",
    "contact",
  ];
  const actualUpdates = Object.keys(req.body);
  const isValidUpdate = actualUpdates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidUpdate) {
    res.status(400).send({ error: "Actualización no permitida" });
    return;
  }

  MerchantModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .exec()
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
 * Elimina un mercader buscándolo por nombre (query string).
 *
 * @remarks
 * Ruta: `DELETE /merchants`
 * - Respuesta 200: Devuelve el mercader eliminado (`MerchantDocument`).
 * - Respuesta 400: Falta parámetro `name`.
 * - Respuesta 404: Mercader no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument  Mercader eliminado.
 *
 * @example
 * ```http
 * DELETE /merchants?name=Zoltan
 * ```
 */
merchantsRouter.delete("/", (req: Request, res: Response) => {
  if (!req.query.name) {
    res
      .status(400)
      .send({ error: "Se debe proporcionar un name en la query string" });
    return;
  }

  MerchantModel.findOneAndDelete({ name: req.query.name.toString() })
    .exec()
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
 * Elimina un mercader por su ID.
 *
 * @remarks
 * Ruta: `DELETE /merchants/:id`
 * - Respuesta 200: Devuelve el mercader eliminado (`MerchantDocument`).
 * - Respuesta 400: Error en la solicitud.
 * - Respuesta 404: Mercader no encontrado.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns MerchantDocument  Mercader eliminado.
 *
 * @example
 * ```http
 * DELETE /merchants/507f1f77bcf86cd799439011
 * ```
 */
merchantsRouter.delete("/:id", (req: Request, res: Response) => {
  MerchantModel.findByIdAndDelete(req.params.id)
    .exec()
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

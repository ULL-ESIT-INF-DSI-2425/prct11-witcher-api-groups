import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  test,
  expect,
} from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { setupApp } from "../src/app.js";
import { MerchantModel } from "../src/models/merchant.js";
import { GoodModel } from "../src/models/good.js";
import { HunterModel } from "../src/models/hunter.js";
import { TransactionModel } from "../src/models/transaction.js";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

beforeEach(async () => {
  await Promise.all([
    GoodModel.deleteMany({}),
    HunterModel.deleteMany({}),
    MerchantModel.deleteMany({}),
    TransactionModel.deleteMany({}),
  ]);
});

describe("CRUD completo de /merchants", () => {
  test("POST /merchants → 201 crea buen mercader válido", async () => {
    const merchant = {
      name: "Merch1",
      location: "Novigrado",
      specialty: "herrero",
      isTraveling: false,
      inventorySize: 10,
      reputation: 5,
      contact: "shop@example.com",
    };
    const res = await request(app)
      .post("/merchants")
      .send(merchant)
      .expect(201);
    expect(res.body).toMatchObject({
      name: "Merch1",
      location: "Novigrado",
      specialty: "herrero",
      contact: "shop@example.com",
    });
  });

  test("POST /merchants → 400 si falta campo required", async () => {
    const bad = {
      location: "Oxenfurt",
      specialty: "alquimista",
      isTraveling: true,
      inventorySize: 5,
      reputation: 3,
      contact: "contact@ex.com",
    };
    const res = await request(app).post("/merchants").send(bad).expect(400);
    expect(res.body).toHaveProperty("errors.name");
  });

  test("POST /merchants → 400 si specialty inválido", async () => {
    const bad = {
      name: "BadSpec",
      location: "Kaer Morhen",
      specialty: "panadero",
      isTraveling: false,
      inventorySize: 5,
      reputation: 2,
      contact: "badspec@ex.com",
    };
    const res = await request(app).post("/merchants").send(bad).expect(400);
    expect(res.body.message).toMatch(/no es una especialidad permitida/);
  });

  test("POST /merchants → 400 si inventorySize fuera de rango", async () => {
    const bad = {
      name: "Inv0",
      location: "Velen",
      specialty: "mercachifle",
      isTraveling: false,
      inventorySize: 0,
      reputation: 1,
      contact: "inv0@ex.com",
    };
    const res = await request(app).post("/merchants").send(bad).expect(400);
    expect(res.body.errors.inventorySize).toBeDefined();
  });

  test("POST /merchants → 400 si reputation fuera de rango", async () => {
    const bad = {
      name: "Rep11",
      location: "Toussaint",
      specialty: "sastre",
      isTraveling: false,
      inventorySize: 10,
      reputation: 11,
      contact: "rep@ex.com",
    };
    const res = await request(app).post("/merchants").send(bad).expect(400);
    expect(res.body.errors.reputation).toBeDefined();
  });

  test("POST /merchants → 400 si contact inválido", async () => {
    const bad = {
      name: "NoEmail",
      location: "Vizima",
      specialty: "armero",
      isTraveling: true,
      inventorySize: 20,
      reputation: 7,
      contact: "invalid-email",
    };
    const res = await request(app).post("/merchants").send(bad).expect(400);
    expect(res.body.message).toMatch(/no es un email válido/);
  });

  test("GET /merchants → 404 si no hay ninguno", async () => {
    await request(app).get("/merchants").expect(404);
  });

  test("GET /merchants → 200 y lista todos", async () => {
    await MerchantModel.create([
      {
        name: "Mer1",
        location: "Novigrado",
        specialty: "sastre",
        isTraveling: false,
        inventorySize: 15,
        reputation: 4,
        contact: "mer1@ex.com",
      },
      {
        name: "Mer2",
        location: "Oxenfurt",
        specialty: "armero",
        isTraveling: true,
        inventorySize: 20,
        reputation: 6,
        contact: "mer2@ex.com",
      },
    ]);
    const res = await request(app).get("/merchants").expect(200);
    expect(res.body).toHaveLength(2);
  });

  test("GET /merchants?name=Mer1 → 200 y filtra por name", async () => {
    await MerchantModel.create({
      name: "FilterMe",
      location: "Cintra",
      specialty: "mercachifle",
      isTraveling: false,
      inventorySize: 8,
      reputation: 3,
      contact: "filter@ex.com",
    });
    const res = await request(app)
      .get("/merchants")
      .query({ name: "FilterMe" })
      .expect(200);
    expect(res.body[0].name).toBe("FilterMe");
  });

  test("GET /merchants?specialty=armero → 200 y filtra por specialty", async () => {
    await MerchantModel.create({
      name: "SpecTest",
      location: "Kaer Morhen",
      specialty: "armero",
      isTraveling: true,
      inventorySize: 12,
      reputation: 5,
      contact: "spec@ex.com",
    });
    const res = await request(app)
      .get("/merchants")
      .query({ specialty: "armero" })
      .expect(200);
    expect(res.body[0].specialty).toBe("armero");
  });

  test("GET /merchants/:id → 200 si existe", async () => {
    const doc = await MerchantModel.create({
      name: "ById",
      location: "Velen",
      specialty: "mercachifle",
      isTraveling: false,
      inventorySize: 5,
      reputation: 2,
      contact: "byid@ex.com",
    });
    const res = await request(app).get(`/merchants/${doc._id}`).expect(200);
    expect(res.body.name).toBe("ById");
  });

  test("GET /merchants/:id → 404 si no existe", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).get(`/merchants/${fake}`).expect(404);
  });

  test("GET /merchants/:id → 500 si id mal formado", async () => {
    await request(app).get("/merchants/1234").expect(500);
  });

  test("PATCH /merchants?name=ByName → 200 modifica por name", async () => {
    await MerchantModel.create({
      name: "ByName",
      location: "Novigrado",
      specialty: "herrero",
      isTraveling: false,
      inventorySize: 20,
      reputation: 7,
      contact: "byname@ex.com",
    });
    const res = await request(app)
      .patch("/merchants")
      .query({ name: "ByName" })
      .send({ reputation: 9 })
      .expect(200);
    expect(res.body.reputation).toBe(9);
  });

  test("PATCH /merchants?name=… → 400 sin query name", async () => {
    await request(app).patch("/merchants").send({ reputation: 4 }).expect(400);
  });

  test("PATCH /merchants?name=… → 400 sin body", async () => {
    await request(app)
      .patch("/merchants")
      .query({ name: "NoBody" })
      .expect(400);
  });

  test("PATCH /merchants?name=… → 400 campo no permitido", async () => {
    await MerchantModel.create({
      name: "Valid",
      location: "Oxenfurt",
      specialty: "sastre",
      isTraveling: true,
      inventorySize: 10,
      reputation: 8,
      contact: "valid@ex.com",
    });
    await request(app)
      .patch("/merchants")
      .query({ name: "Valid" })
      .send({ foo: "bar" })
      .expect(400);
  });

  test("PATCH /merchants?name=… → 404 si no existe", async () => {
    await request(app)
      .patch("/merchants")
      .query({ name: "Nope" })
      .send({ reputation: 1 })
      .expect(404);
  });

  test("PATCH /merchants/:id → 200 modifica por id", async () => {
    const doc = await MerchantModel.create({
      name: "IdName",
      location: "Cintra",
      specialty: "alquimista",
      isTraveling: true,
      inventorySize: 18,
      reputation: 6,
      contact: "idname@ex.com",
    });
    const res = await request(app)
      .patch(`/merchants/${doc._id}`)
      .send({ location: "Temeria" })
      .expect(200);
    expect(res.body.location).toBe("Temeria");
  });

  test("PATCH /merchants/:id → 400 sin body", async () => {
    const doc = await MerchantModel.create({
      name: "NoBody",
      location: "Kaer Morhen",
      specialty: "armero",
      isTraveling: false,
      inventorySize: 22,
      reputation: 3,
      contact: "nobody@ex.com",
    });
    await request(app).patch(`/merchants/${doc._id}`).expect(400);
  });

  test("PATCH /merchants/:id → 400 campo no permitido", async () => {
    const doc = await MerchantModel.create({
      name: "NoFoo",
      location: "Vizima",
      specialty: "herrero",
      isTraveling: true,
      inventorySize: 30,
      reputation: 4,
      contact: "nofoo@ex.com",
    });
    await request(app)
      .patch(`/merchants/${doc._id}`)
      .send({ bar: "baz" })
      .expect(400);
  });

  test("PATCH /merchants/:id → 404 si no existe", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app)
      .patch(`/merchants/${fake}`)
      .send({ reputation: 2 })
      .expect(404);
  });

  test("DELETE /merchants?name=ValidName → 200 elimina por name", async () => {
    await MerchantModel.create({
      name: "ValidDel",
      location: "Velen",
      specialty: "mercachifle",
      isTraveling: false,
      inventorySize: 5,
      reputation: 2,
      contact: "validdel@ex.com",
    });
    await request(app)
      .delete("/merchants")
      .query({ name: "ValidDel" })
      .expect(200);
    expect(await MerchantModel.findOne({ name: "ValidDel" })).toBeNull();
  });

  test("DELETE /merchants?name=… → 400 sin name", async () => {
    await request(app).delete("/merchants").expect(400);
  });

  test("DELETE /merchants?name=… → 404 si no existe", async () => {
    await request(app).delete("/merchants").query({ name: "Nope" }).expect(404);
  });

  test("DELETE /merchants/:id → 200 elimina por id", async () => {
    const doc = await MerchantModel.create({
      name: "XIdDel",
      location: "Novigrado",
      specialty: "sastre",
      isTraveling: true,
      inventorySize: 12,
      reputation: 9,
      contact: "xiddel@ex.com",
    });
    await request(app).delete(`/merchants/${doc._id}`).expect(200);
    expect(await MerchantModel.findById(doc._id)).toBeNull();
  });

  test("DELETE /merchants/:id → 404 si no existe", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).delete(`/merchants/${fake}`).expect(404);
  });

  test("DELETE /merchants/:id → 400 id mal formado", async () => {
    await request(app).delete("/merchants/1234").expect(400);
  });

  test("POST /merchants → 201 y crea correctamente en DB", async () => {
    const merchant = {
      name: "Merch1",
      location: "Novigrado",
      specialty: "herrero",
      isTraveling: false,
      inventorySize: 10,
      reputation: 5,
      contact: "shop@example.com",
    };
    const before = await MerchantModel.countDocuments();
    const res = await request(app).post("/merchants").send(merchant).expect(201);
    expect(res.body).toMatchObject({
      name: merchant.name,
      location: merchant.location,
      specialty: merchant.specialty,
      isTraveling: merchant.isTraveling,
      inventorySize: merchant.inventorySize,
      reputation: merchant.reputation,
      contact: merchant.contact,
    });
    expect(res.body).toHaveProperty("_id");
    const after = await MerchantModel.countDocuments();
    expect(after).toBe(before + 1);
    const fromDb = await MerchantModel.findById(res.body._id).lean();
    expect(fromDb).not.toBeNull();
    expect(fromDb).toMatchObject(merchant);
  });

  test("POST /merchants → 400 si falta campo required y no crea documento", async () => {
    const bad = {
      location: "Oxenfurt",
      specialty: "alquimista",
      isTraveling: true,
      inventorySize: 5,
      reputation: 3,
      contact: "contact@ex.com",
    };
    const before = await MerchantModel.countDocuments();
    const res = await request(app).post("/merchants").send(bad).expect(400);
    expect(res.body).toHaveProperty("errors.name");
    const after = await MerchantModel.countDocuments();
    expect(after).toBe(before);
  });

  test("GET /merchants → 200 y lista todos con campos correctos", async () => {
    const docs = await MerchantModel.create([
      {
        name: "Mer1",
        location: "Novigrado",
        specialty: "sastre",
        isTraveling: false,
        inventorySize: 15,
        reputation: 4,
        contact: "mer1@ex.com",
      },
      {
        name: "Mer2",
        location: "Oxenfurt",
        specialty: "armero",
        isTraveling: true,
        inventorySize: 20,
        reputation: 6,
        contact: "mer2@ex.com",
      },
    ]);
    const res = await request(app).get("/merchants").expect(200);
    expect(res.body).toHaveLength(2);
    const returnedNames = res.body.map((m: any) => m.name);
    expect(returnedNames).toEqual(expect.arrayContaining(["Mer1", "Mer2"]));
    docs.forEach(doc => {
      const match = res.body.find((m: any) => m.name === doc.name);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        name: doc.name,
        location: doc.location,
        specialty: doc.specialty,
        isTraveling: doc.isTraveling,
        inventorySize: doc.inventorySize,
        reputation: doc.reputation,
        contact: doc.contact,
      });
    });
  });

  test("PATCH /merchants?name=ByName → 200 modifica y persiste en DB", async () => {
    await MerchantModel.create({
      name: "ByName",
      location: "Novigrado",
      specialty: "herrero",
      isTraveling: false,
      inventorySize: 20,
      reputation: 7,
      contact: "byname@ex.com",
    });
    const res = await request(app)
      .patch("/merchants")
      .query({ name: "ByName" })
      .send({ reputation: 9 })
      .expect(200);
    expect(res.body.reputation).toBe(9);
    const fromDb = await MerchantModel.findOne({ name: "ByName" }).lean();
    expect(fromDb!.reputation).toBe(9);
  });

  test("DELETE /merchants/:id → 200 elimina y persiste en DB", async () => {
    const doc = await MerchantModel.create({
      name: "XIdDel",
      location: "Novigrado",
      specialty: "sastre",
      isTraveling: true,
      inventorySize: 12,
      reputation: 9,
      contact: "xiddel@ex.com",
    });
    const before = await MerchantModel.countDocuments();
    await request(app).delete(`/merchants/${doc._id}`).expect(200);
    const after = await MerchantModel.countDocuments();
    expect(after).toBe(before - 1);
    expect(await MerchantModel.findById(doc._id)).toBeNull();
  });
});

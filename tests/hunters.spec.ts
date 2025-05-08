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
import { HunterModel } from "../src/models/hunter.js";
import { GoodModel } from "../src/models/good.js";
import { MerchantModel } from "../src/models/merchant.js";
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

describe("CRUD completo de /hunters", () => {
  test("POST /hunters → 201 y crea correctamente en DB", async () => {
    const hunter = {
      name: "Geralt123",
      type: "brujo",
      experience: 80,
      preferredWeapon: "Espada de plata",
      coins: 100,
      isActive: true,
      email: "geralt@example.com",
      monsterSpecialty: ["estriges"],
    };
    const before = await HunterModel.countDocuments();
    const res = await request(app).post("/hunters").send(hunter).expect(201);
    expect(res.body).toMatchObject({
      name: hunter.name,
      type: hunter.type,
      experience: hunter.experience,
      coins: hunter.coins,
      isActive: hunter.isActive,
      email: hunter.email,
      monsterSpecialty: hunter.monsterSpecialty,
    });
    expect(res.body).toHaveProperty("_id");
    const after = await HunterModel.countDocuments();
    expect(after).toBe(before + 1);
    const fromDb = await HunterModel.findById(res.body._id).lean();
    expect(fromDb).not.toBeNull();
    expect(fromDb).toMatchObject(hunter);
  });

  test("POST /hunters → 400 si falta campo required y no crea documento", async () => {
    const bad = {
      type: "brujo",
      experience: 50,
      coins: 10,
      isActive: true,
      monsterSpecialty: ["vampiros"],
      email: "vamp@example.com",
    };
    const before = await HunterModel.countDocuments();
    const res = await request(app).post("/hunters").send(bad).expect(400);
    expect(res.body).toHaveProperty("errors.name");
    const after = await HunterModel.countDocuments();
    expect(after).toBe(before);
  });

  test("POST /hunters → 201 crea buen cazador válido", async () => {
    const hunter = {
      name: "Geralt123",
      type: "brujo",
      experience: 80,
      preferredWeapon: "Espada de plata",
      coins: 100,
      isActive: true,
      email: "geralt@example.com",
      monsterSpecialty: ["estriges"],
    };
    const res = await request(app).post("/hunters").send(hunter).expect(201);
    expect(res.body).toMatchObject({
      name: "Geralt123",
      type: "brujo",
      experience: 80,
      email: "geralt@example.com",
    });
  });

  test("POST /hunters → 400 si falta campo required", async () => {
    const bad = {
      type: "brujo",
      experience: 50,
      coins: 10,
      isActive: true,
      monsterSpecialty: ["vampiros"],
      email: "vamp@example.com",
    };
    const res = await request(app).post("/hunters").send(bad).expect(400);
    expect(res.body).toHaveProperty("errors.name");
  });

  test("POST /hunters → 400 si enum type inválido", async () => {
    const bad = {
      name: "Alice",
      type: "mago",
      experience: 10,
      coins: 5,
      isActive: false,
      monsterSpecialty: ["hombres lobo"],
      email: "alice@example.com",
    };
    const res = await request(app).post("/hunters").send(bad).expect(400);
    expect(res.body.message).toMatch(/no es un tipo de cazador permitido/);
  });

  test("POST /hunters → 400 si email inválido", async () => {
    const bad = {
      name: "Bob",
      type: "bandido",
      experience: 5,
      coins: 0,
      isActive: true,
      email: "not-an-email",
      monsterSpecialty: ["gólems"],
    };
    const res = await request(app).post("/hunters").send(bad).expect(400);
    expect(res.body.message).toMatch(/no es un email válido/);
  });

  test("POST /hunters → 400 si experiencia fuera de rango", async () => {
    const bad = {
      name: "Ciri",
      type: "noble",
      experience: 150,
      coins: 20,
      isActive: true,
      email: "ciri@example.com",
      monsterSpecialty: ["dragones"],
    };
    const res = await request(app).post("/hunters").send(bad).expect(400);
    expect(res.body.errors.experience).toBeDefined();
  });

  test("POST /hunters → 400 si monsterSpecialty vacío", async () => {
    const bad = {
      name: "Dandelion",
      type: "mercenario",
      experience: 10,
      coins: 50,
      isActive: true,
      email: "dandy@example.com",
      monsterSpecialty: [],
    };
    const res = await request(app).post("/hunters").send(bad).expect(400);
    expect(res.body.message).toMatch(
      /Debe tener al menos una especialidad en monstruos/,
    );
  });

  test("GET /hunters → 404 si no hay ninguno", async () => {
    await request(app).get("/hunters").expect(404);
  });

  test("GET /hunters → 200 y lista todos", async () => {
    await HunterModel.create([
      {
        name: "Hun2",
        type: "aldeano",
        experience: 1,
        coins: 1,
        isActive: false,
        email: "h1@example.com",
        monsterSpecialty: ["ratas"],
      },
      {
        name: "H222",
        type: "caballero",
        experience: 20,
        coins: 10,
        isActive: true,
        email: "h2@example.com",
        monsterSpecialty: ["trolls"],
      },
    ]);
    const res = await request(app).get("/hunters").expect(200);
    expect(res.body).toHaveLength(2);
  });

  test("GET /hunters → 200 y lista todos con campos correctos", async () => {
    const docs = await HunterModel.create([
      {
        name: "Hun2",
        type: "aldeano",
        experience: 1,
        coins: 1,
        isActive: false,
        email: "h1@example.com",
        monsterSpecialty: ["ratas"],
      },
      {
        name: "H222",
        type: "caballero",
        experience: 20,
        coins: 10,
        isActive: true,
        email: "h2@example.com",
        monsterSpecialty: ["trolls"],
      },
    ]);
    const res = await request(app).get("/hunters").expect(200);
    expect(res.body).toHaveLength(2);
    const returned = res.body;
    const returnedNames = returned.map((h: any) => h.name);
    expect(returnedNames).toEqual(expect.arrayContaining(["Hun2", "H222"]));
    docs.forEach((doc) => {
      const match = returned.find((h: any) => h.name === doc.name);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        name: doc.name,
        type: doc.type,
        experience: doc.experience,
        coins: doc.coins,
        isActive: doc.isActive,
        email: doc.email,
        monsterSpecialty: doc.monsterSpecialty,
      });
    });
  });

  test("GET /hunters?name=H1 → 200 y filtra por name", async () => {
    await HunterModel.create({
      name: "FName",
      type: "bandido",
      experience: 5,
      coins: 5,
      isActive: true,
      email: "fname@example.com",
      monsterSpecialty: ["gárgolas"],
    });
    const res = await request(app)
      .get("/hunters")
      .query({ name: "FName" })
      .expect(200);
    expect(res.body[0].name).toBe("FName");
  });

  test("GET /hunters?type=mercenario → 200 y filtra por type", async () => {
    await HunterModel.create({
      name: "TName",
      type: "mercenario",
      experience: 15,
      coins: 15,
      isActive: true,
      email: "tname@example.com",
      monsterSpecialty: ["hombres pez"],
    });
    const res = await request(app)
      .get("/hunters")
      .query({ type: "mercenario" })
      .expect(200);
    expect(res.body[0].type).toBe("mercenario");
  });

  test("GET /hunters/:id → 200 si existe", async () => {
    const doc = await HunterModel.create({
      name: "ById",
      type: "aldeano",
      experience: 2,
      coins: 2,
      isActive: false,
      email: "byid@example.com",
      monsterSpecialty: ["murciélagos"],
    });
    const res = await request(app).get(`/hunters/${doc._id}`).expect(200);
    expect(res.body.name).toBe("ById");
  });

  test("GET /hunters/:id → 404 si no existe", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).get(`/hunters/${fake}`).expect(404);
  });

  test("GET /hunters/:id → 500 si id mal formado", async () => {
    await request(app).get("/hunters/1234").expect(500);
  });

  test("PATCH /hunters?name=ByName → 200 modifica por name", async () => {
    await HunterModel.create({
      name: "ByName",
      type: "brujo",
      experience: 10,
      coins: 10,
      isActive: true,
      email: "byname@example.com",
      monsterSpecialty: ["zombis"],
    });
    const res = await request(app)
      .patch("/hunters")
      .query({ name: "ByName" })
      .send({ coins: 20 })
      .expect(200);
    expect(res.body.coins).toBe(20);
  });

  test("PATCH /hunters?name=… → 400 sin query name", async () => {
    await request(app).patch("/hunters").send({ coins: 5 }).expect(400);
  });

  test("PATCH /hunters?name=… → 400 sin body", async () => {
    await request(app).patch("/hunters").query({ name: "X" }).expect(400);
  });

  test("PATCH /hunters?name=… → 400 campo no permitido", async () => {
    await HunterModel.create({
      name: "Valid",
      type: "bandido",
      experience: 5,
      coins: 5,
      isActive: true,
      email: "valid@example.com",
      monsterSpecialty: ["gárgolas"],
    });
    await request(app)
      .patch("/hunters")
      .query({ name: "Valid" })
      .send({ foo: "bar" })
      .expect(400);
  });

  test("PATCH /hunters?name=… → 404 si no existe", async () => {
    await request(app)
      .patch("/hunters")
      .query({ name: "Nope" })
      .send({ coins: 0 })
      .expect(404);
  });

  test("PATCH /hunters/:id → 200 modifica por id", async () => {
    const doc = await HunterModel.create({
      name: "IdName",
      type: "mercenario",
      experience: 30,
      coins: 30,
      isActive: true,
      email: "idname@example.com",
      monsterSpecialty: ["hadas"],
    });
    const res = await request(app)
      .patch(`/hunters/${doc._id}`)
      .send({ name: "IdName2" })
      .expect(200);
    expect(res.body.name).toBe("IdName2");
  });

  test("PATCH /hunters/:id → 400 sin body", async () => {
    const doc = await HunterModel.create({
      name: "NoBody",
      type: "noble",
      experience: 40,
      coins: 40,
      isActive: true,
      email: "nobody@example.com",
      monsterSpecialty: ["espectros"],
    });
    await request(app).patch(`/hunters/${doc._id}`).expect(400);
  });

  test("PATCH /hunters/:id → 400 campo no permitido", async () => {
    const doc = await HunterModel.create({
      name: "NoFoo",
      type: "caballero",
      experience: 50,
      coins: 50,
      isActive: true,
      email: "nofoo@example.com",
      monsterSpecialty: ["gárgolas"],
    });
    await request(app)
      .patch(`/hunters/${doc._id}`)
      .send({ bar: "baz" })
      .expect(400);
  });

  test("PATCH /hunters/:id → 404 si no existe", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).patch(`/hunters/${fake}`).send({ coins: 1 }).expect(404);
  });

  test("PATCH /hunters?name=ByName → 200 modifica y persiste en DB", async () => {
    await HunterModel.create({
      name: "ByName",
      type: "brujo",
      experience: 10,
      coins: 10,
      isActive: true,
      email: "byname@example.com",
      monsterSpecialty: ["zombis"],
    });
    const res = await request(app)
      .patch("/hunters")
      .query({ name: "ByName" })
      .send({ coins: 20 })
      .expect(200);
    expect(res.body.coins).toBe(20);
    const fromDb = await HunterModel.findOne({ name: "ByName" }).lean();
    expect(fromDb).not.toBeNull();
    expect(fromDb!.coins).toBe(20);
  });

  test("DELETE /hunters/:id → 200 elimina y revierte estado en DB", async () => {
    const doc = await HunterModel.create({
      name: "XIdDel",
      type: "aldeano",
      experience: 2,
      coins: 2,
      isActive: false,
      email: "xiddel@example.com",
      monsterSpecialty: ["murciélagos"],
    });
    const before = await HunterModel.countDocuments();
    await request(app).delete(`/hunters/${doc._id}`).expect(200);
    const after = await HunterModel.countDocuments();
    expect(after).toBe(before - 1);
    expect(await HunterModel.findById(doc._id)).toBeNull();
  });

  test("DELETE /hunters?name=ValidName → 200 elimina por name", async () => {
    await HunterModel.create({
      name: "ValidDel",
      type: "mercenario",
      experience: 5,
      coins: 5,
      isActive: true,
      email: "validdel@example.com",
      monsterSpecialty: ["huesos"],
    });
    await request(app)
      .delete("/hunters")
      .query({ name: "ValidDel" })
      .expect(200);
    expect(await HunterModel.findOne({ name: "ValidDel" })).toBeNull();
  });

  test("DELETE /hunters?name=… → 400 sin name", async () => {
    await request(app).delete("/hunters").expect(400);
  });

  test("DELETE /hunters?name=… → 404 si no existe", async () => {
    await request(app).delete("/hunters").query({ name: "Nope" }).expect(404);
  });

  test("DELETE /hunters/:id → 200 elimina por id", async () => {
    const doc = await HunterModel.create({
      name: "XIdDel",
      type: "aldeano",
      experience: 2,
      coins: 2,
      isActive: false,
      email: "xiddel@example.com",
      monsterSpecialty: ["murciélagos"],
    });
    await request(app).delete(`/hunters/${doc._id}`).expect(200);
    expect(await HunterModel.findById(doc._id)).toBeNull();
  });

  test("DELETE /hunters/:id → 404 si no existe", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).delete(`/hunters/${fake}`).expect(404);
  });

  test("DELETE /hunters/:id → 400 id mal formado", async () => {
    await request(app).delete("/hunters/1234").expect(400);
  });
});

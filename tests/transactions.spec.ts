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
import { TransactionModel } from "../src/models/transaction.js";
import { GoodModel } from "../src/models/good.js";
import { HunterModel } from "../src/models/hunter.js";
import { MerchantModel } from "../src/models/merchant.js";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  app = await setupApp();
});

beforeEach(async () => {
  await Promise.all([
    TransactionModel.deleteMany({}),
    GoodModel.deleteMany({}),
    HunterModel.deleteMany({}),
    MerchantModel.deleteMany({}),
  ]);
});

async function seedData() {
  const hunter = await HunterModel.create({
    name: "Geralt",
    type: "brujo",
    experience: 95,
    coins: 500,
    isActive: true,
    monsterSpecialty: ["vampiros"],
    email: "geralt@rivia.com",
  });

  const merchant = await MerchantModel.create({
    name: "Zoltan",
    location: "Novigrado",
    specialty: "armero",
    inventorySize: 50,
    reputation: 8,
    isTraveling: false,
    contact: "zoltan@dwarves.com",
  });

  const goods = await GoodModel.create([
    {
      id: 1,
      name: "Espada de plata",
      material: "acero",
      weight: 2.5,
      value: 250,
      stock: 10,
    },
    {
      id: 2,
      name: "Poción de salud",
      material: "vidrio",
      weight: 0.2,
      value: 50,
      stock: 20,
    },
  ]);

  return { hunter, merchant, goods };
}

describe("/transactions CRUD y validaciones", () => {
  test("POST compra exitosa descuenta stock y retorna 201", async () => {
    const { hunter } = await seedData();
    const res = await request(app)
      .post("/transactions")
      .send({
        type: "purchase",
        clientName: hunter.name,
        items: [
          { goodName: "Espada de plata", quantity: 2 },
          { goodName: "Poción de salud", quantity: 1 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: "purchase",
      totalAmount: 250 * 2 + 50,
    });

    const sword = await GoodModel.findOne({ name: "Espada de plata" });
    const potion = await GoodModel.findOne({ name: "Poción de salud" });
    expect(sword).not.toBeNull();
    expect(sword!.stock).toBe(8);
    expect(potion).not.toBeNull();
    expect(potion!.stock).toBe(19);
  });

  test("POST venta exitosa incrementa stock y retorna 201", async () => {
    const { merchant } = await seedData();
    const res = await request(app)
      .post("/transactions")
      .send({
        type: "sale",
        clientName: merchant.name,
        items: [{ goodName: "Espada de plata", quantity: 5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(250 * 5);

    const sword = await GoodModel.findOne({ name: "Espada de plata" });
    expect(sword!.stock).toBe(15);
  });

  test("POST sin tipo da 400", async () => {
    await seedData();
    const res = await request(app)
      .post("/transactions")
      .send({
        clientName: "Geralt",
        items: [{ goodName: "Espada de plata", quantity: 1 }],
      });
    expect(res.status).toBe(400);
  });

  test("GET /client filtra por nombre de cliente", async () => {
    const { hunter, merchant } = await seedData();

    const espada = await GoodModel.findOne({ name: "Espada de plata" });
    if (!espada) throw new Error("Espada de plata no encontrada");

    const pocion = await GoodModel.findOne({ name: "Poción de salud" });
    if (!pocion) throw new Error("Poción de salud no encontrada");

    await TransactionModel.create({
      type: "purchase",
      client: hunter._id,
      clientModel: "Hunter",
      items: [{ good: espada._id, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250,
    });
    await TransactionModel.create({
      type: "sale",
      client: merchant._id,
      clientModel: "Merchant",
      items: [{ good: pocion._id, quantity: 2, priceAtTransaction: 50 }],
      totalAmount: 100,
    });

    const res = await request(app)
      .get("/transactions/client")
      .query({ clientName: hunter.name });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("purchase");
  });

  test("GET /date-range devuelve transacciones dentro de rango y opcional tipo", async () => {
    const { hunter, merchant } = await seedData();
    const sword = await GoodModel.findOne({ name: "Espada de plata" });
    if (!sword) {
      throw new Error("Sword not found");
    }
    const swordId = sword._id;

    const t1 = {
      type: "purchase",
      client: hunter._id,
      clientModel: "Hunter",
      items: [{ good: swordId, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250,
      date: new Date("2025-01-01"),
    };
    const t2 = {
      type: "sale",
      client: merchant._id,
      clientModel: "Merchant",
      items: [{ good: swordId, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250,
      date: new Date("2025-02-01"),
    };
    await TransactionModel.create([t1, t2]);

    let res = await request(app)
      .get("/transactions/date-range")
      .query({ startDate: "2025-01-01", endDate: "2025-01-31" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    res = await request(app)
      .get("/transactions/date-range")
      .query({ startDate: "2025-01-01", endDate: "2025-12-31", type: "sale" });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("sale");
  });

  test("GET /:id retorna transacción o 404 si no existe", async () => {
    const { hunter } = await seedData();
    const tx = (await TransactionModel.create({
      type: "purchase",
      client: hunter._id,
      clientModel: "Hunter",
      items: [
        {
          good: (await GoodModel.findOne({ name: "Espada de plata" }))!._id,
          quantity: 1,
          priceAtTransaction: 250,
        },
      ],
      totalAmount: 250,
    })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

    let res = await request(app).get(`/transactions/${tx._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(tx._id.toString());

    const fake = new mongoose.Types.ObjectId();
    res = await request(app).get(`/transactions/${fake}`);
    expect(res.status).toBe(404);
  });

  test("PUT actualiza transacción, ajusta stock y retorna 200", async () => {
    const { hunter, merchant } = await seedData();

    const sword = await GoodModel.findOne({ name: "Espada de plata" });
    if (!sword) throw new Error("Espada de plata no encontrada");

    const potion = await GoodModel.findOne({ name: "Poción de salud" });
    if (!potion) throw new Error("Poción de salud no encontrada");

    const tx = await TransactionModel.create({
      type: "purchase",
      client: hunter._id,
      clientModel: "Hunter",
      items: [
        {
          good: sword._id,
          quantity: 2,
          priceAtTransaction: sword.value,
        },
      ],
      totalAmount: sword.value * 2,
    });

    const res = await request(app)
      .put(`/transactions/${tx._id}`)
      .send({
        type: "sale",
        clientName: merchant.name,
        items: [{ goodName: "Poción de salud", quantity: 4 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("sale");

    const s2 = await GoodModel.findById(sword._id);
    if (!s2) throw new Error("Espada actualizada no encontrada");
    expect(s2.stock).toBe(10);

    const p2 = await GoodModel.findById(potion._id);
    if (!p2) throw new Error("Poción actualizada no encontrada");
    expect(p2.stock).toBe(24);
  });

  test("DELETE elimina transacción y revierte stock", async () => {
    const { hunter } = await seedData();
    const sword = await GoodModel.findOne({ name: "Espada de plata" });

    const tx = await TransactionModel.create({
      type: "purchase",
      client: hunter._id,
      clientModel: "Hunter",
      items: [
        { good: sword!._id, quantity: 3, priceAtTransaction: sword!.value },
      ],
      totalAmount: sword!.value * 3,
    });
    if (!sword) {
      throw new Error("Sword not found");
    }
    let updated = await GoodModel.findById(sword._id);
    if (!updated) {
      throw new Error("Updated sword not found");
    }
    expect(updated.stock).toBe(7);

    const res = await request(app).delete(`/transactions/${tx._id}`);
    expect(res.status).toBe(200);

    updated = await GoodModel.findById(sword._id);
    if (!updated) {
      throw new Error("Updated sword not found");
    }
    expect(updated.stock).toBe(10);

    const found = await TransactionModel.findById(tx._id);
    expect(found).toBeNull();
  });

  test("POST compra exitosa → 201, descuenta stock y crea transacción en DB", async () => {
    const { hunter } = await seedData();
    const beforeGoods = await GoodModel.find().lean();
    const beforeTx = await TransactionModel.countDocuments();

    const res = await request(app)
      .post("/transactions")
      .send({ type: "purchase", clientName: hunter.name, items: [
        { goodName: "Espada de plata", quantity: 2 },
        { goodName: "Poción de salud", quantity: 1 },
      ]})
      .expect(201);

    expect(res.body).toMatchObject({ type: "purchase" });
    expect(res.body).toHaveProperty("totalAmount");
    expect(res.body.items).toHaveLength(2);
    const afterTx = await TransactionModel.countDocuments();
    expect(afterTx).toBe(beforeTx + 1);
    const txFromDb = await TransactionModel.findById(res.body._id).lean();
    expect(txFromDb).not.toBeNull();
    expect(txFromDb).not.toBeNull();
    expect(txFromDb!.type).toBe("purchase");

    const sword = await GoodModel.findOne({ name: "Espada de plata" });
    const potion = await GoodModel.findOne({ name: "Poción de salud" });
    expect(sword!.stock).toBe(beforeGoods.find(g => g.name === sword!.name)!.stock - 2);
    expect(potion!.stock).toBe(beforeGoods.find(g => g.name === potion!.name)!.stock - 1);
  });

  test("POST venta exitosa → 201, incrementa stock y crea transacción en DB", async () => {
    const { merchant } = await seedData();
    const beforeGoods = await GoodModel.find().lean();
    const beforeTx = await TransactionModel.countDocuments();

    const res = await request(app)
      .post("/transactions")
      .send({ type: "sale", clientName: merchant.name, items: [
        { goodName: "Espada de plata", quantity: 5 }
      ]})
      .expect(201);

    expect(res.body.type).toBe("sale");
    expect(res.body).toHaveProperty("totalAmount");
    const afterTx = await TransactionModel.countDocuments();
    expect(afterTx).toBe(beforeTx + 1);

    const sword = await GoodModel.findOne({ name: "Espada de plata" });
    expect(sword!.stock).toBe(beforeGoods.find(g => g.name === sword!.name)!.stock + 5);
  });

  test("POST /transactions → 400 si falta tipo y no crea transacción", async () => {
    await seedData();
    const beforeTx = await TransactionModel.countDocuments();
    const res = await request(app)
      .post("/transactions")
      .send({
        clientName: "Geralt",
        items: [{ goodName: "Espada de plata", quantity: 1 }],
      })
      .expect(400);
    expect(res.body).toHaveProperty("error");
    const afterTx = await TransactionModel.countDocuments();
    expect(afterTx).toBe(beforeTx);
  });
  
  test("GET /transactions/client → 200 filtra por cliente", async () => {
    const { hunter, merchant } = await seedData();
    await TransactionModel.create({ type: "purchase", client: hunter._id, clientModel: "Hunter", items: [{ good: (await GoodModel.findOne({ name: "Espada de plata" }))!._id, quantity: 1, priceAtTransaction: 250 }], totalAmount: 250 });
    await TransactionModel.create({ type: "sale", client: merchant._id, clientModel: "Merchant", items: [{ good: (await GoodModel.findOne({ name: "Poción de salud" }))!._id, quantity: 2, priceAtTransaction: 50 }], totalAmount: 100 });

    const res = await request(app).get("/transactions/client").query({ clientName: hunter.name }).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("purchase");
  });

  test("GET /transactions/date-range → 200 filtra por rango y tipo opcional", async () => {
    const { hunter, merchant } = await seedData();
    const sword = (await GoodModel.findOne({ name: "Espada de plata" }))!;
    const t1 = { type: "purchase", client: hunter._id, clientModel: "Hunter", items: [{ good: sword._id, quantity: 1, priceAtTransaction: sword.value }], totalAmount: sword.value, date: new Date("2025-01-01") };
    const t2 = { type: "sale", client: merchant._id, clientModel: "Merchant", items: [{ good: sword._id, quantity: 1, priceAtTransaction: sword.value }], totalAmount: sword.value, date: new Date("2025-02-01") };
    await TransactionModel.create([t1, t2]);

    let res = await request(app).get("/transactions/date-range").query({ startDate: "2025-01-01", endDate: "2025-01-31" }).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].date).toContain("2025-01");

    res = await request(app).get("/transactions/date-range").query({ startDate: "2025-01-01", endDate: "2025-12-31", type: "sale" }).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("sale");
  });

  test("GET /transactions/:id → 200 retorna transacción y 404 si no existe", async () => {
    const { hunter } = await seedData();
    const tx = await TransactionModel.create({ type: "purchase", client: hunter._id, clientModel: "Hunter", items: [{ good: (await GoodModel.findOne({ name: "Espada de plata" }))!._id, quantity: 1, priceAtTransaction: 250 }], totalAmount: 250 }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
    const res = await request(app).get(`/transactions/${tx._id}`).expect(200);
    expect(res.body._id).toBe(tx._id.toString());
    const fake = new mongoose.Types.ObjectId();
    await request(app).get(`/transactions/${fake}`).expect(404);
  });

  test("DELETE /transactions/:id → 200 elimina transacción y revierte stock en DB", async () => {
    const { hunter } = await seedData();
    const sword = (await GoodModel.findOne({ name: "Espada de plata" }))!;
    const txDoc = await TransactionModel.create({
      type: "purchase",
      client: hunter._id,
      clientModel: "Hunter",
      items: [{ good: sword._id, quantity: 3, priceAtTransaction: sword.value }],
      totalAmount: sword.value * 3,
    }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
    const txId = txDoc._id.toString();
    const beforeStock = (await GoodModel.findById(sword._id))!.stock;
    const beforeTx = await TransactionModel.countDocuments();
  
    await request(app).delete(`/transactions/${txId}`).expect(200);
  
    const afterStock = (await GoodModel.findById(sword._id))!.stock;
    expect(afterStock).toBe(beforeStock + 3);
  
    const afterTx = await TransactionModel.countDocuments();
    expect(afterTx).toBe(beforeTx - 1);
  });
  
});

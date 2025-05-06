import { getDb } from '../db/mongodb.js';
import { Good } from '../models/good.js';

async function insertOneGood() {
  const db = await getDb();
  const good: Good = {
    name:        "Laptop Gaming",
    description: "Portátil",
    value:       1299.99,
    id:          1,
    weight:      2.5,
    material:    "Aluminio",
  };
  const result = await db
    .collection<Good>('goods')
    .insertOne(good);
  console.log('InsertOneResult:', result);
}

async function insertManyGoods() {
  const db = await getDb();
  const goods: Good[] = [
    {
      name:        "Laptop Gaming2",
      description: "Portátil2",
      value:       1299.92,
      id:          2,
      weight:      2.2,
      material:    "Aluminio2",
    },
    {
      name:        "Laptop Gaming3",
      description: "Portátil3",
      value:       1299.93,
      id:          3,
      weight:      2.3,
      material:    "Aluminio3",
    },
  ];
  const result = await db
    .collection<Good>('goods')
    .insertMany(goods);
  console.log('InsertManyResult:', result);
}

(async () => {
  await insertOneGood();
  await insertManyGoods();
  process.exit(0);
})();

import { connectMongoose } from '../db/mongoose.js';
import { GoodModel } from '../models/good.js';

async function insertOneGood() {
  const good = new GoodModel({
    id:          1,
    name:        'Laptop Gaming',
    description: 'Portátil',
    value:       1299.99,
    weight:      2.5,
    material:    'Aluminio',
  });
  const result = await good.save();
  console.log('Inserted:', result);
}

async function insertManyGoods() {
  const goods = [
    {
      id:          2,
      name:        'Laptop Gaming2',
      description: 'Portátil2',
      value:       1299.92,
      weight:      2.2,
      material:    'Aluminio2',
    },
    {
      id:          3,
      name:        'Laptop Gaming3',
      description: 'Portátil3',
      value:       1299.93,
      weight:      2.3,
      material:    'Aluminio3',
    },
  ];
  const result = await GoodModel.insertMany(goods);
  console.log('Inserted many:', result);
}

(async () => {
  await connectMongoose();

  await insertOneGood();
  await insertManyGoods();

  process.exit(0);
})();

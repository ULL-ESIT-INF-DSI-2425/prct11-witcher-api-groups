import { connectMongoose } from '../db/mongoose.js';
import { GoodModel } from '../models/good.js';

async function findOneGoodById(id: string) {
  const result = await GoodModel.findById(id).exec();
  console.log('findOne:', result);
}

async function findGoodsByName(name: string) {
  const results = await GoodModel.find({ name }).exec();
  console.log(`find (${name}):`, results);
}

(async () => {
  await connectMongoose();

  await findOneGoodById('6819c55713acd7b653a205f4');
  await findGoodsByName('Laptop Gaming2');

  process.exit(0);
})();

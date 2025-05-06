import { connectMongoose } from '../db/mongodb-mongoose.js';
import { GoodModel } from '../models/good.js';

async function deleteOneGoodById(id: string) {
  const result = await GoodModel.deleteOne({ _id: id });
  console.log('Deleted count (by _id):', result.deletedCount);
}

async function deleteGoodsByName(name: string) {
  const result = await GoodModel.deleteMany({ name });
  console.log(`Deleted count (name = ${name}):`, result.deletedCount);
}

(async () => {
  await connectMongoose();

  await deleteOneGoodById('6819c55713acd7b653a205f4');
  await deleteGoodsByName('Laptop Gaming2');

  process.exit(0);
})();

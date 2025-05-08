import { afterAll } from "vitest";
import mongoose from "mongoose";
import "./goods.spec.ts";
import "./hunters.spec.ts";
import "./merchants.spec.ts";
import "./transactions.spec.ts";

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

let client: MongoClient;
let db: Db;

const globalForMongo = global as unknown as {
  _mongoClient?: MongoClient;
  _mongoDb?: Db;
};

export async function getDb() {
  if (globalForMongo._mongoDb && globalForMongo._mongoClient) {
    return globalForMongo._mongoDb;
  }

  client = new MongoClient(uri);
  await client.connect();
  const databaseName = process.env.MONGODB_DB || "ai_news";
  db = client.db(databaseName);

  globalForMongo._mongoClient = client;
  globalForMongo._mongoDb = db;

  return db;
}

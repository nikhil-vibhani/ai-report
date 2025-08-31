import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { NewsDoc, PaginatedResult } from "@/types/news";

const COLLECTION = "news";

export async function insertNews(doc: Omit<NewsDoc, "_id" | "createdAt" | "updatedAt" | "content"> & { content: string }) {
  const db = await getDb();
  const now = new Date();
  const payload: NewsDoc = {
    ...doc,
    createdAt: now,
    updatedAt: now,
  } as NewsDoc;
  const res = await db.collection<NewsDoc>(COLLECTION).insertOne(payload);
  return { ...payload, _id: res.insertedId };
}

export async function listNews(page = 1, pageSize = 10): Promise<PaginatedResult<NewsDoc>> {
  const db = await getDb();
  const total = await db.collection<NewsDoc>(COLLECTION).countDocuments();
  const items = await db
    .collection<NewsDoc>(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getNewsById(id: string) {
  const db = await getDb();
  return db.collection<NewsDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function deleteNews(id: string) {
  const db = await getDb();
  await db.collection<NewsDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
}

export async function updateNewsContent(id: string, updates: Partial<Pick<NewsDoc, "title" | "category" | "location" | "brief" | "content">>) {
  const db = await getDb();
  await db
    .collection<NewsDoc>(COLLECTION)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  return db.collection<NewsDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

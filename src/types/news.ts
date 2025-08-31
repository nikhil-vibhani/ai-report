import { ObjectId } from "mongodb";

export interface NewsDoc {
  _id?: ObjectId;
  title: string;
  category?: string;
  location?: string;
  brief?: string; // short summary or prompt seed
  content: string; // full AI-generated content (markdown)
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// News generation formats supported by the AI prompt router
export type NewsFormat =
  | "AV"
  | "PKG"
  | "AV_GFX"
  | "EXPRESS"
  | "BULLETIN_26M"
  | "SPECIAL";

// Optional knobs for specific formats
export interface GenerateRequestOptions {
  voCount?: number; // e.g., PKG (default 5), SPECIAL (default 10)
  topBandCount?: number; // e.g., AV (default 5), AV_GFX/SPECIAL
  storyCount?: number; // e.g., BULLETIN_26M (default 30)
  topics?: string[]; // e.g., BULLETIN_26M topic cycle order
}

// Request body for /api/news/generate
export interface GenerateRequestBody {
  title?: string;
  format?: NewsFormat; // optional to keep backward-compatible; default logic will be "EXPRESS" or generic
  category?: string;
  location?: string;
  brief?: string;
  baseContent?: string; // for rewrite/regenerate
  instructions?: string; // for rewrite/regenerate
  options?: GenerateRequestOptions;
}

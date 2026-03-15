import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

// Users (Standard)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Collections: User-created groups of papers
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(), // In a real app, this would be a FK to users
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved Papers: Papers that have been added to collections or reviewed
// We persist them so we can attach notes and organize them
export const savedPapers = pgTable("saved_papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  doi: text("doi"),
  publicationDate: text("publication_date"),
  abstract: text("abstract"),
  pdfLink: text("pdf_link"),
  authors: text("authors"), // JSON string or comma-separated
  category: text("category"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Join table for Collections <-> Papers
export const collectionItems = pgTable("collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  paperId: integer("paper_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// Notes: User notes on specific papers
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  paperId: integer("paper_id").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===
export const collectionsRelations = relations(collections, ({ many }) => ({
  items: many(collectionItems),
}));

export const savedPapersRelations = relations(savedPapers, ({ many }) => ({
  inCollections: many(collectionItems),
  notes: many(notes),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
  paper: one(savedPapers, {
    fields: [collectionItems.paperId],
    references: [savedPapers.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  paper: one(savedPapers, {
    fields: [notes.paperId],
    references: [savedPapers.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, createdAt: true });
export const insertSavedPaperSchema = createInsertSchema(savedPapers).omit({ id: true, createdAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, updatedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

// 1. Paper Object (Used in Search Results and Saved Papers)
export type Paper = typeof savedPapers.$inferSelect;
export type InsertPaper = z.infer<typeof insertSavedPaperSchema>;

// 2. Search
export interface SearchQuery {
  query: string;
}

export interface SearchResponse {
  results: Paper[]; // Mocked papers
}

// 3. Comparison
export interface ComparisonRequest {
  paperIds: number[]; // IDs of papers to compare
  papers?: Paper[]; // Optional: Pass full paper objects if they aren't saved yet
}

export interface ComparisonRow {
  field: string; // e.g., "Research Objective", "Method"
  values: Record<string, string>; // paperId -> value
}

export interface ComparisonResponse {
  headers: { id: string; title: string }[];
  rows: ComparisonRow[];
}

// 4. Collections
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export interface CollectionWithPapers extends Collection {
  papers: Paper[];
}

// 5. Notes
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

// 6. Paper Understanding (Mock)
export interface UnderstandingRequest {
  paperId: number;
  section: string;
  operation: string;
}

export interface UnderstandingResponse {
  output: string;
}

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// USERS (demo/mock auth)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  passwordHash: text("password_hash"), // demo: nullable / any-password for seeded user
  researchDepth: text("research_depth").notNull().default("standard"), // settings (FN-8)
  theme: text("theme").notNull().default("system"),
  density: text("density").notNull().default("comfortable"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// SOURCES (PRD §Source)
// ---------------------------------------------------------------------------
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    inputType: text("input_type").notNull(), // paste | pdf | markdown | url
    originUrl: text("origin_url"), // nullable
    rawText: text("raw_text").notNull(), // stored for re-processing + mention display (BR7)
    charCount: integer("char_count").notNull().default(0),
    status: text("status").notNull().default("queued"), // queued | processing | done | failed
    errorMessage: text("error_message"), // nullable
    conceptCount: integer("concept_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }), // nullable
  },
  (t) => ({
    ownerIdx: index("idx_sources_owner").on(t.ownerUserId),
    statusIdx: index("idx_sources_status").on(t.status),
  })
);

// ---------------------------------------------------------------------------
// CONCEPTS (graph nodes, PRD §Concept)
// ---------------------------------------------------------------------------
export const concepts = pgTable(
  "concepts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // canonical label
    normLabel: text("norm_label").notNull(), // lowercased/normalized for dedup match (BR4)
    aliases: text("aliases").array().notNull().default([]), // merged labels
    shortDefinition: text("short_definition"),
    mentions: jsonb("mentions").notNull().default([]), // [{source_id,snippet,offset_start,offset_end}]
    sourceIds: uuid("source_ids").array().notNull().default([]), // all sources mentioning it
    isCrossSource: boolean("is_cross_source").notNull().default(false), // derived: array_length(source_ids) > 1
    embedding: text("embedding"), // stored as JSON-serialized float8[] for portability
    referencesStatus: text("references_status").notNull().default("none"), // none | generating | ready | failed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("idx_concepts_owner").on(t.ownerUserId),
    normIdx: index("idx_concepts_norm").on(t.ownerUserId, t.normLabel),
    xsrcIdx: index("idx_concepts_xsrc").on(t.ownerUserId, t.isCrossSource),
  })
);

// ---------------------------------------------------------------------------
// RELATIONS (graph edges, PRD §Relation)
// ---------------------------------------------------------------------------
export const relations = pgTable(
  "relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromConceptId: uuid("from_concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    toConceptId: uuid("to_concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // is-a|part-of|prerequisite-of|causes|contradicts|extends|related-to
    directed: boolean("directed").notNull().default(true),
    sourceIds: uuid("source_ids").array().notNull().default([]), // sources asserting this relation
    weight: integer("weight"), // nullable, evidence count
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("idx_relations_owner").on(t.ownerUserId),
    fromIdx: index("idx_relations_from").on(t.fromConceptId),
    toIdx: index("idx_relations_to").on(t.toConceptId),
    uqRelation: uniqueIndex("uq_relation").on(
      t.ownerUserId,
      t.fromConceptId,
      t.toConceptId,
      t.type
    ),
  })
);

// ---------------------------------------------------------------------------
// REFS / further reading (PRD §Reference) — grounded, never fabricated (BR11)
// ---------------------------------------------------------------------------
export const refs = pgTable(
  "refs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conceptId: uuid("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(), // resolvable https URL; DOI/arXiv where available
    snippet: text("snippet"), // grounding quote / why-relevant (BR8)
    sourceKind: text("source_kind"), // web | paper | doc (best effort)
    rank: integer("rank").notNull().default(0),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conceptIdx: index("idx_refs_concept").on(t.conceptId),
  })
);

// ---------------------------------------------------------------------------
// INSIGHTS (PRD §Insight) — hypotheses (BR12)
// ---------------------------------------------------------------------------
export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    anchorType: text("anchor_type").notNull(), // concept | connection
    conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "cascade" }), // nullable
    connectionConceptIds: uuid("connection_concept_ids").array(), // nullable pair
    confidence: text("confidence"), // exact|high|medium|low|none (BR12 ConfidencePill)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("idx_insights_owner").on(t.ownerUserId),
  })
);

// ---------------------------------------------------------------------------
// JOBS — Postgres-backed processing state (no Redis/queue infra; BR10)
// ---------------------------------------------------------------------------
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "cascade" }), // null for per-concept reference jobs
    conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "cascade" }), // set for reference deep-research jobs
    kind: text("kind").notNull(), // extract_source | research_references
    stage: text("stage").notNull().default("ingest"), // ingest | extract | link | research | done | failed
    status: text("status").notNull().default("queued"), // queued | running | done | failed
    attempts: integer("attempts").notNull().default(0), // bounded retries (BR6 max 3)
    log: jsonb("log").notNull().default([]), // per-stage live log for SCR-PROCESSING
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("idx_jobs_owner").on(t.ownerUserId),
    pickupIdx: index("idx_jobs_pickup").on(t.status, t.kind),
  })
);

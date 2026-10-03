/**
 * SQLite database connection — fail-soft.
 *
 * `better-sqlite3` requires native compilation (node-gyp + Visual Studio
 * Build Tools on Windows).  When the native module is not available the
 * export falls back to `null` so the rest of the dashboard (which runs
 * on mock data by default) is unaffected.  API route handlers that use
 * `db` should guard on `db !== null` and return an error response when
 * the database is unavailable.
 */

import path from "path";

let db: import("better-sqlite3").Database | null = null;

try {
  // Dynamic require so the app doesn't crash when the native
  // module isn't compiled (e.g. missing Visual Studio Build Tools).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  const dbPath = path.resolve(process.cwd(), "distra.db");
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  db = database;
} catch {
  // Native module not available — running in mock-data mode.
}

export default db;

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// API tests talk to the real Supabase project: .env gives URL + publishable key,
// .env.test adds the test accounts (see .env.test.example).
export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""),
    // One file at a time: suites share the same remote database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
}));

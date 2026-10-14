import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["tests/**/*.test.ts"],
          globalSetup: ["tests/server.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});

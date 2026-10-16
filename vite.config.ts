import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./", // served from tomphp.github.io/icosagon/
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

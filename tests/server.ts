import type { TestProject } from "vitest/node";
import { createServer } from "vite";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

/** Serves the page with Vite for the browser tests. */
export default async function setup(project: TestProject) {
  const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: "error" });
  await server.listen();
  project.provide("baseUrl", server.resolvedUrls!.local[0]);
  return () => server.close();
}

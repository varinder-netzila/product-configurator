import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve "@/…" the same way Next.js does. Vite v5+ supports this natively.
    tsconfigPaths: true,
  } as never,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});

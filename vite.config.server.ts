import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    ssr: "server/index.ts",
    outDir: "dist/server",
    rollupOptions: {
      external: ["express"],
      output: {
        format: "esm"
      }
    },
  },
  ssr: {
    noExternal: ["@supabase/supabase-js", "@tanstack/react-query"]
  }
});

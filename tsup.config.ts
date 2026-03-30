import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  target: "node18",
  external: [
    "@gitforge/storage",
    "@gitforge/storage/*",
    "@gitforge/billing",
    "@gitforge/billing/*",
  ],
  banner: {
    js: "#!/usr/bin/env node",
  },
});

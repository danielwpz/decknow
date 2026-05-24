import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(workspaceRoot, "packages/runtime-standard/src/decknow.js")],
  outfile: path.join(workspaceRoot, "packages/runtime-standard/decknow.js"),
  bundle: true,
  format: "iife",
  target: ["es2022"],
  platform: "browser",
  legalComments: "none",
  logLevel: "info",
});

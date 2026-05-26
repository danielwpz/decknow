import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");
const source = path.join(workspaceRoot, "skills");
const target = path.join(workspaceRoot, "packages/cli/skills");

if (!fs.existsSync(path.join(source, "SKILL.md"))) {
  throw new Error(`Missing root Decknow skill at ${source}`);
}

copyDirectory(source, target);

function copyDirectory(from, to) {
  fs.rmSync(to, { force: true, recursive: true });
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

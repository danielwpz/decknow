import { spawn } from "node:child_process";

const checks = [
  ["pnpm", ["build:runtime"]],
  ["pnpm", ["exec", "biome", "check", "."]],
  ["pnpm", ["test"]],
  ["node", ["packages/cli/bin/decknow.js", "validate", "examples/basic.html"]],
  ["node", ["packages/cli/bin/decknow.js", "validate", "examples/project-overview.html"]],
];

for (const [command, args] of checks) {
  await run(command, args);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${[command, ...args].join(" ")} failed with ${signal || code}`));
    });
  });
}

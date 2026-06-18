import { spawn } from "node:child_process";

const commands = [
  ["server", ["run", "dev", "--prefix", "server"]],
  ["client", ["run", "dev", "--prefix", "client"]]
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
      children.forEach((item) => {
        if (item !== child && !item.killed) item.kill("SIGTERM");
      });
    }
  });

  return child;
});

function shutdown() {
  children.forEach((child) => {
    if (!child.killed) child.kill("SIGTERM");
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

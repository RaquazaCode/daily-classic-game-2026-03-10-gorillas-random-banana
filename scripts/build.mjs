import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const assetsDir = path.join(root, "assets");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "src"), { recursive: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });

for (const file of ["index.html"]) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}
for (const file of ["main.js", "game-core.js", "styles.css"]) {
  fs.copyFileSync(path.join(root, "src", file), path.join(dist, "src", file));
}
for (const file of fs.readdirSync(assetsDir)) {
  fs.copyFileSync(path.join(assetsDir, file), path.join(dist, "assets", file));
}

console.log("build complete");

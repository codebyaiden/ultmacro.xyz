import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const excluded = new Set([".git", ".github", "dist", "node_modules", "package.json", "package-lock.json", "eslint.config.js", "tsconfig.json", "scripts"]);
const staleAssets = [
	"assets/ui/discord.png",
	"assets/ui/run-strategy-real.png",
	"assets/ui/run-strategy.png",
	"assets/ui/stats.png",
	"assets/ui/strategy-editor.png",
	"assets/ui/ultimate-macro-main.png",
	...[
		"badlands-ii", "cataclysm", "construction-crazy", "crossroads", "dead-ahead", "dusty-bridges",
		"infernal-abyss", "polluted-wasteland-ii", "retro-crossroads", "space-city", "wretched-front"
	].map((name) => `assets/strategy-maps/${name}.png`)
];

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  await cp(join(root, entry.name), join(dist, entry.name), { recursive: true });
}

for (const asset of staleAssets) await rm(join(dist, asset), { force: true });

await writeFile(join(dist, ".nojekyll"), "");

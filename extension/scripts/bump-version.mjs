/**
 * Semver bump for extension/package.json, then sync to manifest.json.
 * Usage: node scripts/bump-version.mjs [patch|minor|major]
 *   or:  npm run bump | npm run bump:minor | npm run bump:major
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(root, "package.json");

const level = (process.argv[2] || "patch").toLowerCase();
if (!["patch", "minor", "major"].includes(level)) {
  console.error('Usage: bump-version.mjs [patch|minor|major]');
  process.exit(1);
}

/** @param {string} v */
function bumpSemver(v) {
  const parts = v.split(".").map((n) => parseInt(String(n), 10) || 0);
  while (parts.length < 3) parts.push(0);
  let [major, minor, patch] = parts;
  if (level === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (level === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const next = bumpSemver(pkg.version);
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
console.log(`package.json version → ${next}`);

const sync = spawnSync(process.execPath, [join(root, "scripts/sync-manifest-version.mjs")], {
  cwd: root,
  stdio: "inherit",
});
process.exit(sync.status ?? 1);

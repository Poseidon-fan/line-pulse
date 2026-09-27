import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { TOML } from 'bun';

const projectRoot = new URL('../', import.meta.url);

function readVersion() {
  const { version } = JSON.parse(readFileSync(new URL('package.json', projectRoot), 'utf8'));
  const numeric = '(?:0|[1-9][0-9]*)';
  const prerelease = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
  const build = '[0-9A-Za-z-]+';
  const pattern = new RegExp(
    `^${numeric}\\.${numeric}\\.${numeric}(?:-${prerelease}(?:\\.${prerelease})*)?(?:\\+${build}(?:\\.${build})*)?$`,
  );

  if (typeof version !== 'string' || version.trim() !== version || !pattern.test(version)) {
    throw new Error('package.json must contain a valid semantic version.');
  }

  return version;
}

function prepareUpdate(path, packageName, version) {
  const file = new URL(path, projectRoot);
  const original = readFileSync(file, 'utf8');
  TOML.parse(original);

  let matches = 0;
  let currentVersion;
  const updated = original
    .split(/(?=^[ \t]*\[)/m)
    .map((section) => {
      if (!/^[ \t]*\[\[?package\]\]?[ \t]*(?:#[^\r\n]*)?\r?\n/.test(section)) {
        return section;
      }

      const definition = TOML.parse(section).package;
      const entry = Array.isArray(definition) ? definition[0] : definition;
      if (entry.name !== packageName || entry.source !== undefined) return section;

      matches += 1;
      currentVersion = entry.version;
      const versionField = /^([ \t]*version[ \t]*=[ \t]*)(["'])[^"'\r\n]*\2/m;
      if (typeof currentVersion !== 'string' || !versionField.test(section)) {
        throw new Error(`Expected a string version for ${packageName} in ${path}.`);
      }

      return section.replace(versionField, (_match, prefix, quote) => {
        return `${prefix}${quote}${version}${quote}`;
      });
    })
    .join('');

  if (matches !== 1) {
    throw new Error(`Expected exactly one local package named ${packageName} in ${path}.`);
  }

  return { path, file, original, updated, currentVersion };
}

function main() {
  const [mode, ...extraArgs] = process.argv.slice(2);
  if (!['--check', '--sync'].includes(mode) || extraArgs.length > 0) {
    throw new Error('Usage: bun scripts/version.mjs --check | --sync');
  }

  const version = readVersion();
  const manifest = TOML.parse(readFileSync(new URL('wasm/Cargo.toml', projectRoot), 'utf8'));
  const packageName = manifest.package?.name;
  if (typeof packageName !== 'string' || !packageName) {
    throw new Error('wasm/Cargo.toml must contain a package name.');
  }

  const updates = ['wasm/Cargo.toml', 'wasm/Cargo.lock'].map((path) => {
    return prepareUpdate(path, packageName, version);
  });
  const pending = updates.filter((update) => update.original !== update.updated);

  if (mode === '--check' && pending.length > 0) {
    const details = pending.map((update) => `${update.path}: ${update.currentVersion}`).join('\n');
    throw new Error(
      `Versions must match package.json (${version}):\n${details}\nRun bun run version:sync and commit the updated files.`,
    );
  }

  for (const update of pending) {
    writeFileSync(update.file, update.updated);
    console.log(`Updated ${update.path} to ${version}`);
  }

  console.log(`Versions are consistent: ${version}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

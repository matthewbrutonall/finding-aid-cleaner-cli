import assert from "node:assert/strict";
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "../cli/index.js");
const fixture = path.join(here, "../fixtures/wrapped-finding-aid.txt");

function run(args, input) {
  const runDirectory = mkdtempSync(path.join(tmpdir(), "finding-aid-cleaner-run-"));
  const stdoutPath = path.join(runDirectory, "stdout.txt");
  const stderrPath = path.join(runDirectory, "stderr.txt");
  let inputDescriptor;
  if (input !== undefined) {
    const inputPath = path.join(runDirectory, "stdin.txt");
    writeFileSync(inputPath, input, "utf8");
    inputDescriptor = openSync(inputPath, "r");
  }
  const stdoutDescriptor = openSync(stdoutPath, "w");
  const stderrDescriptor = openSync(stderrPath, "w");
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: [inputDescriptor ?? "ignore", stdoutDescriptor, stderrDescriptor]
  });
  if (inputDescriptor !== undefined) closeSync(inputDescriptor);
  closeSync(stdoutDescriptor);
  closeSync(stderrDescriptor);
  result.stdout = readFileSync(stdoutPath, "utf8");
  result.stderr = readFileSync(stderrPath, "utf8");
  return result;
}

test("reads stdin and emits machine-readable JSON", () => {
  const result = run(["--format", "json"], "A corres-\npondence note by J.Smith.");
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.tool, "finding-aid-cleaner");
  assert.equal(payload.cleanedText, "A correspondence note by J. Smith.");
  assert.ok(payload.caveats.length > 0);
});

test("writes an output directory with cleaned text and a report", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "finding-aid-cleaner-"));
  const outputDir = path.join(parent, "review");
  const result = run(["--input", fixture, "--output-dir", outputDir]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(path.join(outputDir, "cleaned-finding-aid.txt"), "utf8"), /J\. Smith/);
  const report = JSON.parse(await readFile(path.join(outputDir, "changes.json"), "utf8"));
  assert.equal(report.toolVersion, "0.1.0");
  assert.ok(report.changes.some((change) => change.code === "hyphen_join"));
});

test("refuses to overwrite output unless explicitly forced", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "finding-aid-cleaner-overwrite-"));
  const output = path.join(parent, "cleaned.txt");
  await writeFile(output, "keep me", "utf8");
  const refused = run(["--input", fixture, "--output", output]);
  assert.equal(refused.status, 3);
  assert.equal(await readFile(output, "utf8"), "keep me");
  const forced = run(["--input", fixture, "--output", output, "--force"]);
  assert.equal(forced.status, 0, forced.stderr);
  assert.match(await readFile(output, "utf8"), /J\. Smith/);
});

test("returns invalid-input status for empty input", () => {
  const result = run([], "   ");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /finding-aid text first/i);
});

test("never replaces the source input file", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "finding-aid-cleaner-source-"));
  const source = path.join(parent, "source.txt");
  await writeFile(source, "The corres-\npondence.", "utf8");
  const result = run(["--input", source, "--output", source, "--force"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /source input file/i);
  assert.equal(await readFile(source, "utf8"), "The corres-\npondence.");
});

test("rejects one path for both cleaned text and JSON report", () => {
  const result = run(["--input", fixture, "--output", "same", "--report", "same"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /different paths/i);
});

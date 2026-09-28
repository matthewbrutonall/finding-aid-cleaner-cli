import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  FINDING_AID_CLEANER_VERSION,
  cleanFindingAidText,
  parseFindingAidInput
} from "../core/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));

test("joins hyphenated OCR wraps and spaces initials", () => {
  const result = cleanFindingAidText("The corres-\npondence of J.Smith.\n\n\nNext series.");
  assert.match(result.cleanedText, /correspondence of J\. Smith\./);
  assert.match(result.cleanedText, /Next series\./);
  assert.ok(result.changes.some((change) => change.code === "hyphen_join" && change.count >= 1));
  assert.ok(result.changes.some((change) => change.code === "initials" && change.count >= 1));
  assert.match(result.chatPrompt, /SUPPLIED SOURCE MATERIAL/);
  assert.equal(result.toolVersion, FINDING_AID_CLEANER_VERSION);
  assert.ok(result.caveats.length > 0);
});

test("matches the stable fixture output", async () => {
  const input = await readFile(path.join(here, "../fixtures/wrapped-finding-aid.txt"), "utf8");
  const expected = await readFile(path.join(here, "../fixtures/wrapped-finding-aid.cleaned.txt"), "utf8");
  assert.equal(cleanFindingAidText(input).cleanedText, expected.trimEnd());
});

test("rejects empty and oversized input", () => {
  assert.equal(parseFindingAidInput({ text: "   " }).ok, false);
  assert.equal(parseFindingAidInput("x".repeat(200_001)).ok, false);
});

test("preserves paragraph boundaries without rewriting words", () => {
  const result = cleanFindingAidText("Scope:  Not eval.\ncontinues here\n\nTitle: St.Mary's");
  assert.equal(result.cleanedText, "Scope: Not eval. continues here\n\nTitle: St.Mary's");
});

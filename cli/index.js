#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  FINDING_AID_CLEANER_VERSION,
  buildFindingAidChangeReport,
  cleanFindingAidText,
  parseFindingAidInput
} from "../core/index.js";

const HELP = `Usage: finding-aid-clean [options]

Clean plain-text finding-aid OCR deterministically.

Options:
  -i, --input <file>       Read from a UTF-8 text file; use - or omit for stdin
  -o, --output <file>      Write cleaned text to a file
      --report <file>      Write a JSON change report
      --output-dir <dir>   Write cleaned-finding-aid.txt and changes.json
      --format <text|json> Write cleaned text or the full JSON result to stdout
      --force              Allow explicit replacement of output files
  -h, --help               Show help
  -v, --version            Show version

Exit codes: 0 success, 1 internal failure, 2 invalid input/arguments, 3 output exists.`;

function parseArguments(argv) {
  const options = { input: null, output: null, report: null, outputDir: null, format: "text", force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") return { action: "help" };
    if (argument === "-v" || argument === "--version") return { action: "version" };
    if (argument === "--force") {
      options.force = true;
      continue;
    }
    const names = {
      "-i": "input",
      "--input": "input",
      "-o": "output",
      "--output": "output",
      "--report": "report",
      "--output-dir": "outputDir",
      "--format": "format"
    };
    const name = names[argument];
    if (!name) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[name] = value;
    index += 1;
  }
  if (!new Set(["text", "json"]).has(options.format)) throw new Error("--format must be text or json.");
  if (options.outputDir && (options.output || options.report)) {
    throw new Error("Use --output-dir by itself, or use --output and --report explicitly.");
  }
  if (options.output && options.report && path.resolve(options.output) === path.resolve(options.report)) {
    throw new Error("--output and --report must use different paths.");
  }
  return { action: "run", options };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let parsedArguments;
  try {
    parsedArguments = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\nRun with --help for usage.\n`);
    return 2;
  }

  if (parsedArguments.action === "help") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (parsedArguments.action === "version") {
    process.stdout.write(`${FINDING_AID_CLEANER_VERSION}\n`);
    return 0;
  }

  const options = parsedArguments.options;
  let source;
  try {
    source = options.input && options.input !== "-" ? await readFile(options.input, "utf8") : await readStdin();
  } catch (error) {
    process.stderr.write(`Could not read input: ${error.message}\n`);
    return 2;
  }

  const parsedInput = parseFindingAidInput(source);
  if (!parsedInput.ok) {
    process.stderr.write(`${parsedInput.errors.join("\n")}\n`);
    return 2;
  }

  const result = cleanFindingAidText(parsedInput.input.text);
  let outputPath = options.output;
  let reportPath = options.report;
  if (options.outputDir) {
    outputPath = path.join(options.outputDir, "cleaned-finding-aid.txt");
    reportPath = path.join(options.outputDir, "changes.json");
  }

  if (options.input && options.input !== "-") {
    const sourcePath = path.resolve(options.input);
    if ([outputPath, reportPath].filter(Boolean).some((target) => path.resolve(target) === sourcePath)) {
      process.stderr.write("Refusing to replace the source input file. Choose a different output path.\n");
      return 2;
    }
  }

  const targets = [outputPath, reportPath].filter(Boolean);
  if (!options.force) {
    for (const target of targets) {
      if (await exists(target)) {
        process.stderr.write(`Refusing to overwrite existing output: ${target}\n`);
        return 3;
      }
    }
  }

  try {
    if (options.outputDir) await mkdir(options.outputDir, { recursive: true });
    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, result.cleanedText, "utf8");
      process.stderr.write(`Wrote cleaned text to ${outputPath}\n`);
    }
    if (reportPath) {
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, `${JSON.stringify(buildFindingAidChangeReport(result), null, 2)}\n`, "utf8");
      process.stderr.write(`Wrote change report to ${reportPath}\n`);
    }
  } catch (error) {
    process.stderr.write(`Could not write output: ${error.message}\n`);
    return 1;
  }

  if (!outputPath || options.format === "json") {
    const data = options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : result.cleanedText;
    process.stdout.write(data);
  }
  return 0;
}

process.exitCode = await main();

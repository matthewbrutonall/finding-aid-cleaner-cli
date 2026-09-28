# Finding-aid Cleaner

Version `0.1.0`, extracted from Archive Buddy commit `5d981ac4f3b258cb867175afd4bbd46e14fd43f9`.

This deterministic tool cleans common OCR and hard-wrapped plain text while producing a transparent change report. It joins hyphenated line breaks and wrapped lines, collapses excess whitespace and blank lines, and spaces adjacent initials such as `J.Smith`.

It does not use AI, upload text, rewrite descriptions, infer missing content, expand abbreviations, or process PDF, DOCX, or images. Review the cleaned result against the source.

## CLI

```bash
node tools/finding-aid-cleaner/cli/index.js \
  --input tools/finding-aid-cleaner/fixtures/wrapped-finding-aid.txt \
  --output-dir /tmp/finding-aid-review
```

Pipe text and receive JSON:

```bash
printf 'The corres-\npondence of J.Smith.' | \
  node tools/finding-aid-cleaner/cli/index.js --format json
```

The CLI never changes its source file. It refuses to replace an existing output unless `--force` is explicitly supplied, and it requires separate paths for cleaned text and the JSON report. Diagnostics go to stderr; cleaned text or JSON data goes to stdout. Exit codes are `0` success, `1` internal/write failure, `2` invalid input or arguments, and `3` existing output.

## JSON result

The machine-readable result includes `tool`, `toolVersion`, input/output character counts, `cleanedText`, change counts, professional caveats, and a guarded `chatPrompt` that labels the text as supplied source material.

## Public web tool

From the repository root, run `npm run serve` and open `http://localhost:4173/web/public/finding-aid-cleaner/`. Processing happens entirely in the browser. The page has no analytics, account, persistence, or network-processing code.

## Drift control

When the Archive Buddy source changes, compare its `src/lib/finding-aid-cleaner/index.ts`, documentation, and tests with this core and fixture suite. Increment this tool version only after intentional review; do not copy SaaS authentication, billing, analytics, or conversation code.

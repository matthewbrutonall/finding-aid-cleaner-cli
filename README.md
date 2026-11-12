# Finding-aid Cleaner CLI

![Plain-text finding aid passing through a terminal into cleaned text and a changes report](assets/finding-aid-cleaner-cli.png)

A small command-line tool for cleaning common formatting problems in plain-text archival finding aids.

It can:

- join words broken across line endings;
- join hard-wrapped lines;
- remove excess spaces and blank lines; and
- change adjacent initials such as `J.Smith` to `J. Smith`.

It does not use AI, perform OCR, or process PDF/DOCX/image files. It does not rewrite descriptions, expand abbreviations, or correct facts. Always check the result against the original source.

## Use

Requires Node.js 20 or later.

```bash
node cli/index.js --input finding-aid.txt --output-dir cleaned/
```

This creates:

- `cleaned/cleaned-finding-aid.txt`
- `cleaned/changes.json`

For JSON on stdout:

```bash
node cli/index.js --input finding-aid.txt --format json
```

The tool also accepts piped text. It never changes the source file and refuses to overwrite an existing output unless `--force` is supplied explicitly.

Run the tests with:

```bash
npm test
```

Version `0.1.0`, extracted from Archive Buddy commit `5d981ac4f3b258cb867175afd4bbd46e14fd43f9`.

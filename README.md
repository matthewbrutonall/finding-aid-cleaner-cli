# Finding-aid Cleaner CLI

![Plain-text finding aid passing through a terminal into cleaned text and a changes report](assets/finding-aid-cleaner-cli.png)

A **finding aid** is a guide to the contents of an archival collection. Text copied from an old guide may contain words split across lines, narrow-page line wrapping, and uneven spacing. This **command-line tool** tidies those formatting problems in plain-text files.

For example, it can turn `The corres-` followed on the next line by `pondence of J.Smith` into `The correspondence of J. Smith`. The repository includes a [before-and-after example](fixtures/wrapped-finding-aid.txt) you can try. The tool changes presentation, not the facts in a description.

It is for archivists and others preparing a plain-text finding aid for review or reuse. You give it a UTF-8 text file; it writes cleaned text and, if requested, a report of the changes.

## What it changes

It can:

- join words broken across line endings;
- join hard-wrapped lines;
- remove excess spaces and blank lines; and
- change adjacent initials such as `J.Smith` to `J. Smith`.

It applies fixed local rules; it does not use AI or upload text. It does not perform OCR, process PDF/DOCX/image files, rewrite descriptions, expand abbreviations, or correct facts. Compare the result with the original, especially where a line break may have been meaningful.

The source file is not changed. The CLI refuses to use the source file as an output path and refuses to replace existing output files unless you explicitly pass `--force`.

## Set it up with your AI agent

Copy and paste this into your agent:

```text
Install the Finding-aid Cleaner CLI from https://github.com/matthewbrutonall/finding-aid-cleaner-cli on my computer. Check that Node.js 20 or later is available, install the repository as a command-line tool, and verify that `finding-aid-clean --version` works. Tell me how to run it. Do not clean any files yet.
```

## Run it yourself

Requires Node.js 20 or later.

```bash
git clone https://github.com/matthewbrutonall/finding-aid-cleaner-cli.git
cd finding-aid-cleaner-cli
node cli/index.js --help
node cli/index.js --input fixtures/wrapped-finding-aid.txt --output-dir cleaned/
```

This creates:

- `cleaned/cleaned-finding-aid.txt`
- `cleaned/changes.json`

Use your own text file in place of the example path. You can also print the cleaned text to the terminal instead of saving it:

```bash
node cli/index.js --input finding-aid.txt
```

For cleaned text and change details as JSON on stdout:

```bash
node cli/index.js --input finding-aid.txt --format json
```

The tool also accepts piped text. `--output` and `--report` let you choose separate output filenames. Run `node cli/index.js --help` for all options.

There is a separate [Finding-aid Cleaner agent skill](https://github.com/matthewbrutonall/finding-aid-cleaner) for people who want an agent to guide the cleanup. The CLI works independently.

Run the tests with:

```bash
npm test
```

Version `0.1.0`, extracted from Archive Buddy commit `5d981ac4f3b258cb867175afd4bbd46e14fd43f9`.

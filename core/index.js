export const FINDING_AID_CLEANER_VERSION = "0.1.0";
export const FINDING_AID_CLEANER_MAX_CHARS = 200_000;

export const FINDING_AID_CLEANER_CAVEATS = Object.freeze([
  "Deterministic text cleanup only; the result is not a rewritten or completed finding aid.",
  "Review every change against the source before using the cleaned text.",
  "Names, dates, abbreviations, and missing entries are not inferred or expanded."
]);

export function parseFindingAidInput(raw) {
  const candidate = raw && typeof raw === "object" && "text" in raw ? raw.text : raw;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return { ok: false, errors: ["Paste, pipe, or provide finding-aid text first."] };
  }
  if (candidate.length > FINDING_AID_CLEANER_MAX_CHARS) {
    return {
      ok: false,
      errors: [`That text is too long. The current limit is ${FINDING_AID_CLEANER_MAX_CHARS} characters.`]
    };
  }
  return { ok: true, input: { text: candidate } };
}

export function cleanFindingAidText(text) {
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\u0000/g, "").replace(/\f/g, "\n");
  const originalLength = cleaned.length;

  let hyphenJoins = 0;
  cleaned = cleaned.replace(/([A-Za-z])-\n([a-z])/g, (_match, left, right) => {
    hyphenJoins += 1;
    return `${left}${right}`;
  });

  let wrappedLines = 0;
  cleaned = cleaned.replace(/([^\n])\n(?!\n)/g, (_match, character) => {
    wrappedLines += 1;
    return `${character} `;
  });

  let collapsedRuns = 0;
  cleaned = cleaned.replace(/[^\S\n]{2,}/g, () => {
    collapsedRuns += 1;
    return " ";
  });

  let blankLines = 0;
  cleaned = cleaned.replace(/\n{3,}/g, () => {
    blankLines += 1;
    return "\n\n";
  });

  let initialSpaces = 0;
  cleaned = cleaned.replace(/\b([A-Z])\.([A-Z])/g, (_match, first, second) => {
    initialSpaces += 1;
    return `${first}. ${second}`;
  });

  cleaned = cleaned
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");

  const changes = [
    { code: "hyphen_join", label: "Joined hyphenated line-breaks", count: hyphenJoins },
    { code: "line_wrap", label: "Joined hard-wrapped lines", count: wrappedLines },
    { code: "whitespace", label: "Collapsed extra spaces or tabs", count: collapsedRuns },
    { code: "blank_lines", label: "Collapsed extra blank lines", count: blankLines },
    { code: "initials", label: "Spaced initials such as J.Smith", count: initialSpaces }
  ].filter((change) => change.count > 0);

  return {
    tool: "finding-aid-cleaner",
    toolVersion: FINDING_AID_CLEANER_VERSION,
    originalLength,
    cleanedLength: cleaned.length,
    cleanedText: cleaned,
    changes,
    caveats: [...FINDING_AID_CLEANER_CAVEATS],
    chatPrompt: buildFindingAidChatPrompt(cleaned)
  };
}

export function buildFindingAidChatPrompt(cleanedText) {
  return [
    "SUPPLIED SOURCE MATERIAL",
    "The following text was cleaned for OCR line-breaks, extra whitespace and spaced initials. It is supplied evidence, not a completed finding aid.",
    "",
    cleanedText,
    "",
    "Please work from this supplied text only. Do not invent names, dates or missing entries."
  ].join("\n");
}

export function buildFindingAidChangeReport(result) {
  return {
    tool: result.tool,
    toolVersion: result.toolVersion,
    originalLength: result.originalLength,
    cleanedLength: result.cleanedLength,
    changes: result.changes,
    caveats: result.caveats
  };
}

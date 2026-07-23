import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const projectRoot = "C:/Users/HP/Documents/GitHub/Digitally Virtual/Codex_Version";
const sourcePath = path.join(projectRoot, "Q&A.csv");
const outputDir = path.join(
  projectRoot,
  "outputs",
  "019f8ee9-8cd0-7440-93e6-811053d908e6",
);
const outputPath = path.join(outputDir, "Module-B-Question-Bank-Review.xlsx");
const previewDir = path.join(outputDir, "previews");
const candidateJsonPath = path.join(
  projectRoot,
  "work",
  "module-b-question-bank",
  "screened-candidates.json",
);

const csvText = await fs.readFile(sourcePath, "utf8");
const sourceWorkbook = await Workbook.fromCSV(csvText, { sheetName: "Source" });
const sourceValues = sourceWorkbook.worksheets
  .getItem("Source")
  .getUsedRange(true).values;

const sourceHeaders = sourceValues[0].map((value) => String(value ?? ""));
const expectedHeaders = [
  "Questions",
  "Option_1",
  "Option_2",
  "Option_3",
  "Option_4",
  "Answer",
  "Explaination",
  "Subject",
  "Series",
];
if (sourceHeaders.join("|") !== expectedHeaders.join("|")) {
  throw new Error(`Unexpected source schema: ${sourceHeaders.join("|")}`);
}

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");

const cleanText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[ \t]+/g, " ");

const mapSubject = (subject) => {
  if (
    subject === "Artificial Intelligence" ||
    subject === "Computer Applications"
  ) {
    return "Computer";
  }
  return subject;
};

const detectTopic = (subject, question) => {
  const text = normalize(question);
  if (subject === "Computer") {
    if (/artificial intelligence|data science|computer vision|nlp|stemming|corpus|stop word/.test(text)) {
      return "Artificial Intelligence";
    }
    if (/html|web page|webpage|heading tag|font tag|list/.test(text)) {
      return "Web & HTML";
    }
    if (/protocol|internet|network|tcp|ftp|smtp|pop3|telnet|sftp|https|browser|server|email|e-mail/.test(text)) {
      return "Internet & Networks";
    }
    if (/plagiarism|spam|open source|e-governance|e-shopping|reservation portal/.test(text)) {
      return "Digital Citizenship";
    }
    return "Computing Fundamentals";
  }

  if (subject === "Mathematics") {
    if (/sin|cos|tan|cot|sec|cosec|trigonometric|elevation|shadow/.test(text)) {
      return "Trigonometry";
    }
    if (/quadratic|discriminant|polynomial|zeroes|zeros/.test(text)) {
      return "Quadratic Equations & Polynomials";
    }
    if (/circle|tangent|sector|arc|chord/.test(text)) {
      return "Circle Theorems";
    }
    if (/probability|random|dice|die|card|outcomes|balls in a bag/.test(text)) {
      return "Probability";
    }
    if (/mean|median|mode|frequency distribution|modal class/.test(text)) {
      return "Statistics";
    }
    if (/coordinate|mid-point|midpoint|distance between the points|quadrant|x-axis|y-axis/.test(text)) {
      return "Coordinate Geometry";
    }
    if (/a\.p\.|arithmetic progression|consecutive terms/.test(text)) {
      return "Sequences";
    }
    if (/hcf|lcm|prime|factorisation|factorization|divisib/.test(text)) {
      return "Number Systems";
    }
    if (/linear equation|pair of equations|system of equations/.test(text)) {
      return "Linear Equations";
    }
    if (/triangle|similar|congruent|angle/.test(text)) {
      return "Geometry";
    }
    if (/area|volume|surface|cube|cylinder|cone|hemisphere|sphere/.test(text)) {
      return "Mensuration";
    }
    return "General Mathematics";
  }

  if (/reproduction|gamete|chromosome|dna|heredity|zygote|sex of a child/.test(normalize(question))) {
    return "Genetics & Reproduction";
  }
  if (/respiration|heart|blood|lymph|digestion|neuron|synapse|hormone|plant|photosynthesis/.test(normalize(question))) {
    return "Life Processes";
  }
  if (/reaction|acid|base|salt|metal|hydrocarbon|compound|electron|chloride|hydroxide|ph/.test(normalize(question))) {
    return "Chemistry";
  }
  if (/electric|current|resistor|resistance|voltage|magnet|solenoid|circuit|heat produced/.test(normalize(question))) {
    return "Electricity & Magnetism";
  }
  if (/lens|mirror|optical|refraction|reflection|image formed|focal|ray of light|beam of (?:white )?light|prism|scattering of light|human eye/.test(normalize(question))) {
    return "Light & Optics";
  }
  if (/ecosystem|food chain|environment|biodegradable|trophic|waste/.test(normalize(question))) {
    return "Environment";
  }
  return "General Science";
};

const classifyDifficulty = (subject, topic, question) => {
  const text = normalize(question);
  if (
    topic === "Trigonometry" ||
    topic === "Quadratic Equations & Polynomials" ||
    topic === "Circle Theorems" ||
    topic === "Electricity & Magnetism" ||
    topic === "Light & Optics" ||
    topic === "Genetics & Reproduction"
  ) {
    return "Hard";
  }

  if (
    topic === "Coordinate Geometry" ||
    topic === "Linear Equations" ||
    topic === "Mensuration" ||
    topic === "Chemistry" ||
    topic === "Life Processes" ||
    topic === "Artificial Intelligence"
  ) {
    return "Medium";
  }

  if (
    question.length > 180 ||
    /\([ivx]+\)|assertion|reason|statements are|select the correct statements/.test(text)
  ) {
    return "Medium";
  }

  return "Easy";
};

const strongVisualPattern =
  /(?:\bgiven\s+figure\b|\bfigure\s+given\s+below\b|\badjoining\s+figure\b|\bshown\s+(?:here|below|above|in\s+the\s+(?:figure|diagram))\b|\bgraph\s+(?:below|of .*\s+is\s+(?:given|shown))\b|\b(?:following|given)\s+diagram\b|\bdiagram\.\s+in this field\b|\bwarning sign shown\b|\bobserve\s+the\s+(?:given\s+)?figures?\b|\bas\s+shown\b)/i;

const splicePattern =
  /questions?\s+number|assertion\s+and\s+reason|cumulative frequency for calculating|median class for the data|in order to prepare dry hydrogen chloride|select from the following a hydrocarbon|an optical device|pure-tall pea plant|essential element taken up|bell-jar|human heart\s*\?|prime number has|10\.the|9\.\s*the|15\.\s*the/i;

const corruptNotationPattern =
  /(?:\b(?:sin|cos|tan|cot|sec|cosec)\s+q\b|\b(?:asin|acos|sec\d|tan\d)\b|\b(?:r3|x2|x3)\b|πd\s*\d|\b\d+\s+\d+\s*(?:units?|cm|m)?$|´|\bq\s*´|\bcos\s*=\s*\d{2}\b|\bsin\s*=\s*\d{2}\b)/i;

const manuallyFlaggedRows = new Map([
  [9, "Incomplete question stem and incomplete distractor."],
  [11, "Stemming answer depends on the algorithm and is ambiguous."],
  [13, "Classification/localisation and object detection wording is ambiguous."],
  [24, "Remote-diagnostics wording is outdated and misleading."],
  [45, "Incorrect key: TELNET is not secure remote login; SSH is absent."],
  [53, "Ambiguous key: both SFTP and SCP are secure file-transfer protocols."],
  [90, "Truncated question and neighbouring content spliced into an option."],
  [93, "Incorrect key: the displayed median class is 20–30, not 40–50."],
  [94, "Formula notation is corrupted."],
  [109, "Duplicate correct options and corrupted trigonometric notation."],
  [113, "Neighbouring assertion/reason instructions are spliced into an option."],
  [115, "Duplicate options and corrupted trigonometric notation."],
  [123, "Duplicate distractor and corrupted trigonometric notation."],
  [136, "Trigonometric expression is unreadable."],
  [144, "Ratio values were converted into decimal/time formats."],
  [150, "Visible equation and stored answer are inconsistent; source is likely corrupted."],
  [153, "Neighbouring question text is spliced into an option."],
  [156, "Incomplete probability question stem."],
  [159, "Missing figure and spliced option text."],
  [160, "Incomplete probability question stem."],
  [166, "Trigonometric variables and symbols are missing."],
  [178, "Trigonometric expression and fractions are unreadable."],
  [183, "Ratios were converted into time values."],
  [193, "Missing figure and incomplete geometry notation."],
  [201, "Missing figure and missing mathematical expression."],
  [205, "Neighbouring question text is spliced into an option."],
  [217, "Displayed points and stored answer are inconsistent."],
  [237, "Trigonometric variable and symbols are missing."],
  [242, "Graph required but not present."],
  [248, "Neighbouring question text is spliced into an option."],
  [249, "Probability notation is severely corrupted."],
  [250, "Multiple questions are merged into one record."],
  [274, "Mensuration question stem is incomplete."],
  [278, "Trigonometric expression is unreadable."],
  [281, "Linear equations lost mathematical operators."],
  [284, "Probability fraction is corrupted."],
  [285, "Mensuration question stem and formula are incomplete."],
  [288, "Mensuration question stem and formula are incomplete."],
  [312, "Formula notation and question spelling are corrupted."],
  [318, "Formula notation and question spelling are corrupted."],
  [324, "Formula notation and question spelling are corrupted."],
  [325, "Neighbouring statistics question is spliced into an option."],
  [328, "Trigonometric expression is unreadable."],
  [329, "Displayed coordinates and stored answer are inconsistent."],
  [331, "Trigonometric expression is unreadable."],
  [344, "Coordinate notation is unreadable."],
  [352, "Trigonometric expression is unreadable."],
  [354, "Missing figure and duplicated correct option."],
  [356, "Required geometry measurement is missing and options are duplicated."],
  [358, "Polynomial notation and stored key are corrupted."],
  [359, "Trigonometric fractions are unreadable."],
  [362, "Trigonometric fractions are unreadable."],
  [365, "Polynomial options and stored answer are incomplete."],
  [369, "Fractions were converted into dates."],
  [377, "Linear equation operators are missing; key cannot be verified."],
  [382, "Incorrect key: displayed equations represent parallel lines."],
  [407, "More than one option can be correct for magnetic-field strength."],
  [412, "More than one option can be correct for magnetic-field strength."],
  [418, "Incorrect inhalation key and neighbouring question spliced into an option."],
  [422, "The resistor combination required to calculate total resistance is missing."],
  [426, "Required magnetic-field diagram is missing."],
  [441, "Refractive-index fractions and scientific notation are corrupted."],
  [442, "The resistor combinations referenced by the question are not included."],
  [443, "Incorrect key: fine particles scatter blue light more strongly than red."],
  [445, "Required conductor-and-loop arrangement is missing."],
  [446, "Incorrect key for non-biodegradable waste."],
  [473, "Neighbouring chemistry question is spliced into the correct option."],
  [474, "Neighbouring chemistry question is spliced into an option."],
  [476, "Neighbouring optics question is spliced into an option."],
  [477, "Neighbouring genetics question is spliced into an option."],
  [478, "Correct combined germ-cell option is contaminated and key is incomplete."],
  [479, "Incorrect key and neighbouring optics question spliced into an option."],
  [480, "Correct option is contaminated by neighbouring text and stored key is unreliable."],
  [482, "Near-duplicate optics question with a corrupted magnification symbol."],
  [487, "Required optics figure is missing."],
  [488, "Required plant figures are missing."],
  [491, "Required warning-sign figure is missing."],
  [506, "Incorrect key: a Y-bearing sperm produces a zygote with 44 + XY chromosomes."],
  [508, "Incorrect synapse key and neighbouring figure text spliced into an option."],
  [510, "Required experiment figure is missing."],
  [512, "Incorrect key for anaerobic respiration characteristics."],
  [515, "Required trophic-level figure is missing."],
  [516, "Incorrect key: Spirogyra commonly reproduces asexually by fragmentation."],
  [518, "Incorrect photosynthesis key; the valid events are light absorption and conversion to chemical energy."],
  [525, "Required magnetic-field direction diagram is missing."],
  [528, "Question stem is incomplete."],
  [529, "Question stem is corrupted and required circuit arrangement is absent."],
  [531, "Required leaf-cell diagram is missing."],
  [539, "Near-duplicate corrupted circuit question."],
  [547, "Heat result is ambiguous unless constant voltage or constant current is specified."],
  [552, "Question explicitly depends on a missing figure."],
  [565, "Incorrect key: heating elements require high resistivity and high melting point."],
  [571, "Incorrect key: resistance depends on area but not on conductor shape."],
  [574, "Incorrect optics key: beyond 2F gives a real, inverted, diminished image."],
  [575, "Incorrect key: lead, not silver, is the poor conductor among the options."],
]);

const candidateRows = [];
const quarantineRows = [];

for (let index = 1; index < sourceValues.length; index += 1) {
  const rowNumber = index + 1;
  const values = sourceValues[index].map(cleanText);
  const [
    question,
    optionA,
    optionB,
    optionC,
    optionD,
    answer,
    explanation,
    originalSubject,
    series,
  ] = values;
  const options = [optionA, optionB, optionC, optionD];
  const subject = mapSubject(originalSubject);
  const topic = detectTopic(subject, question);
  const difficulty = classifyDifficulty(subject, topic, question);
  const reasons = [];

  if (strongVisualPattern.test(question)) {
    reasons.push("Visual or diagram required but unavailable");
  }

  const combinedCells = [...options, answer].join(" ");
  if (splicePattern.test(combinedCells)) {
    reasons.push("Neighbouring question or instruction text is spliced into the record");
  }

  if (
    options.some((value) => /^\d{1,2}:\d{2}$/.test(value)) ||
    options.some((value) => /^\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(value)) ||
    /^\d{1,2}:\d{2}$/.test(answer) ||
    /^\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(answer)
  ) {
    reasons.push("Spreadsheet auto-formatting corrupted a fraction or ratio");
  }

  const normalizedOptions = options.map(normalize);
  const duplicateOptions =
    new Set(normalizedOptions.filter(Boolean)).size !== normalizedOptions.filter(Boolean).length;
  if (duplicateOptions) {
    reasons.push("Duplicate answer options");
  }

  const matchingAnswerIndexes = normalizedOptions
    .map((value, optionIndex) => (value === normalize(answer) ? optionIndex : -1))
    .filter((optionIndex) => optionIndex >= 0);
  if (matchingAnswerIndexes.length === 0) {
    reasons.push("Stored answer does not match any option");
  } else if (matchingAnswerIndexes.length > 1) {
    reasons.push("Stored answer matches more than one option");
  }

  if (
    subject === "Mathematics" &&
    corruptNotationPattern.test([question, ...options, answer].join(" "))
  ) {
    reasons.push("Mathematical notation requires reconstruction");
  }

  if (question.length < 24) {
    reasons.push("Question stem appears incomplete");
  }

  if (manuallyFlaggedRows.has(rowNumber)) {
    reasons.push(manuallyFlaggedRows.get(rowNumber));
  }

  if (!normalize(explanation).includes(normalize(answer))) {
    reasons.push("Explanation and stored answer are inconsistent");
  }

  if (reasons.length > 0) {
    quarantineRows.push([
      rowNumber,
      subject,
      difficulty,
      topic,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      answer,
      explanation,
      series,
      originalSubject,
      [...new Set(reasons)].join("; "),
      strongVisualPattern.test(question)
        ? "Exclude until a visual is created or replace with a self-contained question."
        : "Correct from a reliable source, independently verify the answer, then rescreen.",
    ]);
    continue;
  }

  const correctOptionIndex = matchingAnswerIndexes[0];
  const editorialNotes = [
    "Automated structural screening passed.",
    "Rewrite the explanation to teach the reasoning before publication.",
  ];
  if (/<\/?[a-z][^>]*>/i.test([question, ...options, answer].join(" "))) {
    editorialNotes.push("Render HTML tags as escaped code text.");
  }
  if (subject === "Computer" && originalSubject !== "Computer") {
    editorialNotes.push(`Mapped from ${originalSubject}.`);
  }

  candidateRows.push([
    `QB-${String(rowNumber).padStart(4, "0")}`,
    rowNumber,
    subject,
    difficulty,
    topic,
    question,
    optionA,
    optionB,
    optionC,
    optionD,
    ["A", "B", "C", "D"][correctOptionIndex],
    answer,
    explanation,
    series,
    originalSubject,
    editorialNotes.join(" "),
  ]);
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
const candidate = workbook.worksheets.add("Candidate Bank");
const quarantine = workbook.worksheets.add("Quarantine");
const rules = workbook.worksheets.add("Rules");

const burgundy = "#6D1018";
const burgundyDark = "#4A0B10";
const gold = "#C9A54C";
const goldSoft = "#F4E8C1";
const cream = "#FBF7EC";
const ink = "#2F241B";
const muted = "#6E655D";
const lightBorder = "#D8CBA8";
const white = "#FFFFFF";
const easyFill = "#E5F4E8";
const mediumFill = "#FFF2CC";
const hardFill = "#FCE4E4";

for (const sheet of [summary, candidate, quarantine, rules]) {
  sheet.showGridLines = false;
}

summary.getRange("A1:J1").merge();
summary.getRange("A1").values = [["MODULE B — QUESTIONS & ANSWERS"]];
summary.getRange("A2:J2").merge();
summary.getRange("A2").values = [[
  "Question-bank screening for Mathematics, Science and Computer · Easy → Medium → Hard",
]];
summary.getRange("A1:J2").format = {
  fill: burgundy,
  font: { color: white, bold: true, name: "Georgia" },
  verticalAlignment: "center",
};
summary.getRange("A1:J1").format.font = {
  color: goldSoft,
  bold: true,
  name: "Georgia",
};
summary.getRange("A1:J1").format.rowHeight = 32;
summary.getRange("A2:J2").format.rowHeight = 24;

summary.getRange("A4:A6").values = [
  ["Candidate records"],
  ["Quarantined records"],
  ["Source records"],
];
summary.getRange("B4").formulas = [["=COUNTA('Candidate Bank'!A2:A600)"]];
summary.getRange("B5").formulas = [["=COUNTA('Quarantine'!A2:A600)"]];
summary.getRange("B6").formulas = [["=B4+B5"]];

summary.getRange("D4:D6").values = [
  ["Mathematics"],
  ["Science"],
  ["Computer"],
];
summary.getRange("E4").formulas = [["=COUNTIF('Candidate Bank'!C2:C600,\"Mathematics\")"]];
summary.getRange("E5").formulas = [["=COUNTIF('Candidate Bank'!C2:C600,\"Science\")"]];
summary.getRange("E6").formulas = [["=COUNTIF('Candidate Bank'!C2:C600,\"Computer\")"]];

summary.getRange("G4:G6").values = [["Easy"], ["Medium"], ["Hard"]];
summary.getRange("H4").formulas = [["=COUNTIF('Candidate Bank'!D2:D600,\"Easy\")"]];
summary.getRange("H5").formulas = [["=COUNTIF('Candidate Bank'!D2:D600,\"Medium\")"]];
summary.getRange("H6").formulas = [["=COUNTIF('Candidate Bank'!D2:D600,\"Hard\")"]];

for (const rangeAddress of ["A4:B6", "D4:E6", "G4:H6"]) {
  const range = summary.getRange(rangeAddress);
  range.format = {
    fill: cream,
    borders: { preset: "outside", style: "thin", color: gold },
  };
}
summary.getRange("A4:A6").format.font = { bold: true, color: burgundyDark };
summary.getRange("D4:D6").format.font = { bold: true, color: burgundyDark };
summary.getRange("G4:G6").format.font = { bold: true, color: burgundyDark };
summary.getRange("B4:B6").format.font = { bold: true, color: ink };
summary.getRange("E4:E6").format.font = { bold: true, color: ink };
summary.getRange("H4:H6").format.font = { bold: true, color: ink };
summary.getRange("B4:B6").format.numberFormat = "0";
summary.getRange("E4:E6").format.numberFormat = "0";
summary.getRange("H4:H6").format.numberFormat = "0";

summary.getRange("A8:J8").merge();
summary.getRange("A8").values = [["READINESS DECISION"]];
summary.getRange("A8:J8").format = {
  fill: goldSoft,
  font: { bold: true, color: burgundyDark },
  borders: { preset: "doubleBottom", style: "medium", color: gold },
};
summary.getRange("A9:J11").merge();
summary.getRange("A9").values = [[
  "Candidate Bank means the record passed structural and known-defect screening. It is not publication-ready until its explanation is rewritten and the answer is independently fact-checked. Quarantined rows must not enter Module B.",
]];
summary.getRange("A9:J11").format = {
  fill: cream,
  font: { color: ink },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: lightBorder },
};

summary.getRange("A13:B17").values = [
  ["Decision", "Approved direction"],
  ["Audience", "Classes VI–VIII"],
  ["Subjects", "Mathematics · Science · Computer"],
  ["Difficulty", "Easy → Medium → Hard"],
  ["Visual questions", "Excluded until visuals are added"],
];
summary.getRange("A13:B13").format = {
  fill: burgundy,
  font: { color: white, bold: true },
};
summary.getRange("A14:B17").format = {
  fill: cream,
  borders: { preset: "inside", style: "thin", color: lightBorder },
};
summary.getRange("A1:A17").format.columnWidth = 24;
summary.getRange("B1:B17").format.columnWidth = 20;
summary.getRange("C1:C17").format.columnWidth = 3;
summary.getRange("D1:D17").format.columnWidth = 22;
summary.getRange("E1:E17").format.columnWidth = 12;
summary.getRange("F1:F17").format.columnWidth = 3;
summary.getRange("G1:G17").format.columnWidth = 16;
summary.getRange("H1:H17").format.columnWidth = 12;
summary.getRange("I1:J17").format.columnWidth = 12;

const candidateHeaders = [
  "Question_ID",
  "Source_Row",
  "Subject",
  "Difficulty",
  "Topic",
  "Question",
  "Option_A",
  "Option_B",
  "Option_C",
  "Option_D",
  "Correct_Option",
  "Correct_Answer",
  "Explanation",
  "Source_Series",
  "Original_Subject",
  "Editorial_Note",
];
candidate
  .getRangeByIndexes(0, 0, candidateRows.length + 1, candidateHeaders.length)
  .values = [candidateHeaders, ...candidateRows];
const candidateTable = candidate.tables.add(
  `A1:P${candidateRows.length + 1}`,
  true,
  "CandidateQuestionBank",
);
candidateTable.style = "TableStyleMedium2";
candidate.freezePanes.freezeRows(1);
candidate.freezePanes.freezeColumns(5);
candidate.getRange("A1:P1").format = {
  fill: burgundy,
  font: { color: white, bold: true },
  wrapText: true,
};
candidate.getRange(`A2:P${candidateRows.length + 1}`).format = {
  verticalAlignment: "top",
  wrapText: true,
};
candidate.getRange(`C2:C${candidateRows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["Mathematics", "Science", "Computer"] },
};
candidate.getRange(`D2:D${candidateRows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["Easy", "Medium", "Hard"] },
};
candidate.getRange(`D2:D${candidateRows.length + 1}`).conditionalFormats.add(
  "containsText",
  { text: "Easy", format: { fill: easyFill, font: { color: "#225B31" } } },
);
candidate.getRange(`D2:D${candidateRows.length + 1}`).conditionalFormats.add(
  "containsText",
  { text: "Medium", format: { fill: mediumFill, font: { color: "#705500" } } },
);
candidate.getRange(`D2:D${candidateRows.length + 1}`).conditionalFormats.add(
  "containsText",
  { text: "Hard", format: { fill: hardFill, font: { color: burgundyDark } } },
);

const candidateWidths = [14, 11, 15, 12, 28, 52, 30, 30, 30, 30, 14, 30, 48, 15, 22, 42];
candidateWidths.forEach((width, columnIndex) => {
  candidate.getRangeByIndexes(0, columnIndex, candidateRows.length + 1, 1).format.columnWidth = width;
});
candidate.getRange(`B1:B${candidateRows.length + 1}`).format.numberFormat = "0";

const quarantineHeaders = [
  "Source_Row",
  "Subject",
  "Suggested_Difficulty",
  "Topic",
  "Question",
  "Option_A",
  "Option_B",
  "Option_C",
  "Option_D",
  "Stored_Answer",
  "Explanation",
  "Source_Series",
  "Original_Subject",
  "Quarantine_Reasons",
  "Action_Required",
];
quarantine
  .getRangeByIndexes(0, 0, quarantineRows.length + 1, quarantineHeaders.length)
  .values = [quarantineHeaders, ...quarantineRows];
const quarantineTable = quarantine.tables.add(
  `A1:O${quarantineRows.length + 1}`,
  true,
  "QuarantinedQuestions",
);
quarantineTable.style = "TableStyleMedium10";
quarantine.freezePanes.freezeRows(1);
quarantine.freezePanes.freezeColumns(4);
quarantine.getRange("A1:O1").format = {
  fill: burgundyDark,
  font: { color: white, bold: true },
  wrapText: true,
};
quarantine.getRange(`A2:O${quarantineRows.length + 1}`).format = {
  verticalAlignment: "top",
  wrapText: true,
};
const quarantineWidths = [11, 15, 18, 27, 50, 27, 27, 27, 27, 28, 44, 15, 22, 52, 42];
quarantineWidths.forEach((width, columnIndex) => {
  quarantine.getRangeByIndexes(0, columnIndex, quarantineRows.length + 1, 1).format.columnWidth = width;
});
quarantine.getRange(`N2:N${quarantineRows.length + 1}`).conditionalFormats.add(
  "containsText",
  { text: "Visual", format: { fill: mediumFill, font: { color: "#705500" } } },
);
quarantine.getRange(`N2:N${quarantineRows.length + 1}`).conditionalFormats.add(
  "containsText",
  { text: "Incorrect", format: { fill: hardFill, font: { color: burgundyDark } } },
);
quarantine.getRange(`A1:A${quarantineRows.length + 1}`).format.numberFormat = "0";

rules.getRange("A1:D1").merge();
rules.getRange("A1").values = [["CONTENT SCREENING AND CLASSIFICATION RULES"]];
rules.getRange("A1:D1").format = {
  fill: burgundy,
  font: { color: goldSoft, bold: true, name: "Georgia" },
};
rules.getRange("A3:D3").values = [["Area", "Rule", "Outcome", "Rationale"]];
rules.getRange("A3:D3").format = {
  fill: goldSoft,
  font: { color: burgundyDark, bold: true },
};
const ruleRows = [
  ["Source preservation", "Q&A.csv is never overwritten.", "Original retained", "Every decision remains traceable to Source_Row."],
  ["Subject mapping", "Artificial Intelligence and Computer Applications map to Computer.", "Three subjects", "Matches the approved Module B structure."],
  ["Visual dependency", "Questions needing a figure, graph, diagram or sign are excluded.", "Quarantine", "Visuals will be added later."],
  ["Answer integrity", "Answers must match exactly one option.", "Quarantine on failure", "Prevents unfair scoring."],
  ["Duplicate options", "Normalized options must be unique.", "Quarantine", "Removes ambiguous choices."],
  ["Spreadsheet corruption", "Date/time-like fractions and ratios are rejected.", "Quarantine", "Prevents 5/9 becoming 05-Sep."],
  ["OCR and notation", "Unreadable formulas, fractions or operators are rejected.", "Quarantine", "Mathematical meaning must be reconstructable."],
  ["Easy", "Direct recall or one-step foundational reasoning.", "Easy", "Accessible entry point."],
  ["Medium", "Application, interpretation or multi-step reasoning.", "Medium", "Builds subject expertise."],
  ["Hard", "Trigonometry, quadratic equations, circle theorems and advanced science.", "Hard", "Preserves the approved advanced content."],
  ["Explanation quality", "Candidate explanations still require pedagogical rewriting.", "Editorial review", "Immediate feedback must teach, not merely repeat the key."],
  ["Publication gate", "Only independently verified and enriched records may enter Module B.", "Not yet publishable", "This workbook is a screening artifact."],
];
rules.getRangeByIndexes(3, 0, ruleRows.length, 4).values = ruleRows;
rules.getRange(`A4:D${ruleRows.length + 3}`).format = {
  fill: cream,
  borders: { preset: "inside", style: "thin", color: lightBorder },
  verticalAlignment: "top",
  wrapText: true,
};
rules.getRange(`A1:A${ruleRows.length + 3}`).format.columnWidth = 24;
rules.getRange(`B1:B${ruleRows.length + 3}`).format.columnWidth = 52;
rules.getRange(`C1:C${ruleRows.length + 3}`).format.columnWidth = 22;
rules.getRange(`D1:D${ruleRows.length + 3}`).format.columnWidth = 52;
rules.freezePanes.freezeRows(3);

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const previews = [
  ["Summary", "A1:J17", "summary.png"],
  ["Candidate Bank", "A1:P12", "candidate-bank.png"],
  ["Quarantine", "A1:O12", "quarantine.png"],
  ["Rules", "A1:D15", "rules.png"],
];
for (const [sheetName, range, fileName] of previews) {
  const rendered = await workbook.render({
    sheetName,
    range,
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(previewDir, fileName),
    new Uint8Array(await rendered.arrayBuffer()),
  );
}

const summaryInspection = await workbook.inspect({
  kind: "table",
  sheetId: "Summary",
  range: "A1:J17",
  include: "values,formulas",
  maxChars: 6000,
  tableMaxRows: 20,
  tableMaxCols: 12,
});
const errorInspection = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

await fs.writeFile(
  candidateJsonPath,
  JSON.stringify(
    candidateRows.map((row) => ({
      id: row[0],
      sourceRow: row[1],
      subject: row[2],
      difficulty: row[3],
      topic: row[4],
      question: row[5],
      options: row.slice(6, 10),
      correctOption: row[10],
      answer: row[11],
      explanation: row[12],
      series: row[13],
      originalSubject: row[14],
    })),
    null,
    2,
  ),
  "utf8",
);

const countBy = (rows, index) =>
  rows.reduce((counts, row) => {
    const key = row[index];
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

console.log(JSON.stringify({
  outputPath,
  candidateJsonPath,
  sourceRows: sourceValues.length - 1,
  candidateRows: candidateRows.length,
  quarantineRows: quarantineRows.length,
  candidateBySubject: countBy(candidateRows, 2),
  candidateByDifficulty: countBy(candidateRows, 3),
  summaryInspection: summaryInspection.ndjson,
  errorInspection: errorInspection.ndjson,
}, null, 2));

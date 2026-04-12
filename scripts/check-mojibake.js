const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INCLUDED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".scss",
  ".html",
  ".prisma",
]);
const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

const suspiciousPatterns = [
  { regex: /(?:Ð.|Ñ.){2,}/g, reason: "latin mojibake sequence" },
  { regex: /(?:Р[\u0400-\u04FF]|С[\u0400-\u04FF]){2,}/g, reason: "cyrillic mojibake sequence" },
  { regex: /\uFFFD/g, reason: "replacement character" },
];

function shouldScan(filePath) {
  return INCLUDED_EXTENSIONS.has(path.extname(filePath));
}

function walk(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }

    if (entry.isFile() && shouldScan(fullPath)) {
      results.push(fullPath);
    }
  }
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function checkFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const issues = [];

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    issues.push({ line: 1, reason: "UTF-8 BOM is forbidden" });
  }

  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of suspiciousPatterns) {
      if (pattern.regex.test(line)) {
        issues.push({
          line: index + 1,
          reason: pattern.reason,
          snippet: line.trim(),
        });
        pattern.regex.lastIndex = 0;
        break;
      }
      pattern.regex.lastIndex = 0;
    }
  });

  return issues;
}

const files = [];
walk(ROOT, files);

const problems = files.flatMap((filePath) =>
  checkFile(filePath).map((issue) => ({
    file: toRelative(filePath),
    ...issue,
  })),
);

if (problems.length > 0) {
  console.error("Encoding check failed. Suspicious text found:");
  for (const problem of problems) {
    const suffix = problem.snippet ? ` -> ${problem.snippet}` : "";
    console.error(`${problem.file}:${problem.line} ${problem.reason}${suffix}`);
  }
  process.exit(1);
}

console.log("Encoding check passed.");

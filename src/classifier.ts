import { TerminalIssue } from "./types";
import { compactWhitespace, includesAny, normalize } from "./utils";

type ClassifyInput = {
  output: string;
  command: string;
  exitCode: number | undefined;
  includeWarnings: boolean;
  treatUnknownExitCodeAsError: boolean;
};

type Rule = {
  kind: TerminalIssue["kind"];
  patterns: string[];
  summary: string;
};

const rules: Rule[] = [
  {
    kind: "command-not-found",
    summary: "Command was not found.",
    patterns: [
      "command not found",
      "not recognized as an internal or external command",
      "is not recognized as the name of a cmdlet",
      "the term",
      "enoent"
    ]
  },
  {
    kind: "permission-denied",
    summary: "Permission was denied.",
    patterns: [
      "permission denied",
      "access is denied",
      "operation not permitted",
      "eacces",
      "eperm"
    ]
  },
  {
    kind: "syntax-error",
    summary: "Syntax error detected.",
    patterns: [
      "syntaxerror",
      "syntax error",
      "unexpected token",
      "unexpected end of input",
      "parse error"
    ]
  },
  {
    kind: "runtime-error",
    summary: "Runtime error detected.",
    patterns: [
      "traceback",
      "exception",
      "uncaught",
      "fatal error",
      "runtimeerror",
      "typeerror",
      "referenceerror",
      "valueerror",
      "panic:",
      "segmentation fault"
    ]
  },
  {
    kind: "test-failed",
    summary: "Test failure detected.",
    patterns: [
      "test failed",
      "tests failed",
      "failed tests",
      "failing tests",
      "assertionerror",
      "expect(received)",
      "jest",
      "vitest",
      "pytest",
      "rspec"
    ]
  },
  {
    kind: "build-failed",
    summary: "Build failure detected.",
    patterns: [
      "build failed",
      "failed to compile",
      "compilation failed",
      "webpack compiled with",
      "typescript error",
      "tsc failed",
      "vite build"
    ]
  },
  {
    kind: "package-error",
    summary: "Package manager error detected.",
    patterns: [
      "npm err!",
      "pnpm err",
      "yarn error",
      "cannot find module",
      "module not found",
      "eresolve",
      "dependency conflict",
      "lockfile"
    ]
  }
];

export function classifyTerminalIssue(input: ClassifyInput): TerminalIssue | null {
  const output = normalize(input.output);
  const command = normalize(input.command);
  const searchable = `${command}\n${output}`;

  for (const rule of rules) {
    const matchedPattern = includesAny(searchable, rule.patterns);
    if (matchedPattern) {
      return {
        kind: rule.kind,
        command: input.command,
        exitCode: input.exitCode,
        matchedPattern,
        summary: rule.summary
      };
    }
  }

  if (command.startsWith("git ") && input.exitCode !== undefined && input.exitCode !== 0) {
    return {
      kind: "git-error",
      command: input.command,
      exitCode: input.exitCode,
      summary: "Git command failed."
    };
  }

  if (isBuildCommand(command) && input.exitCode !== undefined && input.exitCode !== 0) {
    return {
      kind: "build-failed",
      command: input.command,
      exitCode: input.exitCode,
      summary: "Build command failed."
    };
  }

  if (input.includeWarnings) {
    const warningPattern = includesAny(searchable, [
      "warning",
      "warn ",
      "deprecated",
      "deprecationwarning"
    ]);

    if (warningPattern) {
      return {
        kind: "warning",
        command: input.command,
        exitCode: input.exitCode,
        matchedPattern: warningPattern,
        summary: "Warning detected."
      };
    }
  }

  if (input.exitCode !== undefined && input.exitCode !== 0) {
    return {
      kind: "exit-code",
      command: input.command,
      exitCode: input.exitCode,
      summary: `Command failed with exit code ${input.exitCode}.`
    };
  }

  if (input.exitCode === undefined && input.treatUnknownExitCodeAsError) {
    return {
      kind: "unknown-exit-code",
      command: input.command,
      exitCode: undefined,
      summary: "Command ended with an unknown exit code."
    };
  }

  return null;
}

export function formatIssue(issue: TerminalIssue): string {
  const command = compactWhitespace(issue.command);
  const codeText = issue.exitCode === undefined ? "unknown" : String(issue.exitCode);
  const patternText = issue.matchedPattern ? `, matched: ${issue.matchedPattern}` : "";

  return `${issue.summary} kind: ${issue.kind}, exit code: ${codeText}${patternText}, command: ${command}`;
}

function isBuildCommand(command: string): boolean {
  return [
    "npm run build",
    "pnpm build",
    "yarn build",
    "bun run build",
    "tsc",
    "vite build",
    "next build"
  ].some((part) => command.includes(part));
}

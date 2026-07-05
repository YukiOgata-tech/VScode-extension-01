export type TerminalIssueKind =
  | "exit-code"
  | "unknown-exit-code"
  | "command-not-found"
  | "permission-denied"
  | "syntax-error"
  | "runtime-error"
  | "test-failed"
  | "build-failed"
  | "package-error"
  | "git-error"
  | "warning";

export type TerminalIssue = {
  kind: TerminalIssueKind;
  command: string;
  exitCode: number | undefined;
  matchedPattern?: string;
  summary: string;
};

export type ExtensionConfig = {
  enabled: boolean;
  playOnSuccess: boolean;
  includeWarnings: boolean;
  treatUnknownExitCodeAsError: boolean;
  showNotification: boolean;
  errorSoundFile: string;
  warningSoundFile: string;
  successSoundFile: string;
  cooldownMs: number;
  maxOutputChars: number;
  ignoredCommands: string[];
  soundMode: string;
  soundModes: Record<string, SoundModeConfig>;
};

export type SoundModeConfig = {
  errorSoundFile?: string;
  warningSoundFile?: string;
  successSoundFile?: string;
};

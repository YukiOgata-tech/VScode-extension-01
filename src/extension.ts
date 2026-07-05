import * as vscode from "vscode";
import { classifyTerminalIssue, formatIssue } from "./classifier";
import {
  getConfig,
  getSoundFiles,
  selectSoundMode,
  switchToNextSoundMode,
  toggleEnabled
} from "./config";
import { SoundPlayer } from "./sound";
import { TerminalIssue } from "./types";
import { stripAnsi, truncateMiddle } from "./utils";

type RunningExecution = {
  output: string;
};

const runningExecutions = new WeakMap<vscode.TerminalShellExecution, RunningExecution>();

let lastIssue: TerminalIssue | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const soundPlayer = new SoundPlayer(context);

  const startDisposable = vscode.window.onDidStartTerminalShellExecution((event) => {
    const config = getConfig();
    const state: RunningExecution = { output: "" };
    runningExecutions.set(event.execution, state);

    void collectExecutionOutput(event.execution, state, config.maxOutputChars);
  });

  const endDisposable = vscode.window.onDidEndTerminalShellExecution((event) => {
    void handleExecutionEnd(event, soundPlayer);
  });

  const testErrorDisposable = vscode.commands.registerCommand(
    "oneTruthCue.testErrorSound",
    async () => {
      const soundFiles = getSoundFiles();
      await soundPlayer.play(soundFiles.errorSoundFile, 0);
    }
  );

  const testWarningDisposable = vscode.commands.registerCommand(
    "oneTruthCue.testWarningSound",
    async () => {
      const soundFiles = getSoundFiles();
      await soundPlayer.play(soundFiles.warningSoundFile, 0);
    }
  );

  const testSuccessDisposable = vscode.commands.registerCommand(
    "oneTruthCue.testSuccessSound",
    async () => {
      const soundFiles = getSoundFiles();
      await soundPlayer.play(soundFiles.successSoundFile, 0);
    }
  );

  const selectSoundModeDisposable = vscode.commands.registerCommand(
    "oneTruthCue.selectSoundMode",
    async () => {
      const selectedMode = await selectSoundMode();
      if (selectedMode) {
        vscode.window.showInformationMessage(`One Truth Cue: cue mode set to "${selectedMode}".`);
      }
    }
  );

  const nextSoundModeDisposable = vscode.commands.registerCommand(
    "oneTruthCue.nextSoundMode",
    async () => {
      const nextMode = await switchToNextSoundMode();
      if (nextMode) {
        vscode.window.showInformationMessage(`One Truth Cue: cue mode set to "${nextMode}".`);
      }
    }
  );

  const toggleDisposable = vscode.commands.registerCommand(
    "oneTruthCue.toggleEnabled",
    async () => {
      const enabled = await toggleEnabled();
      vscode.window.showInformationMessage(`One Truth Cue: ${enabled ? "enabled" : "disabled"}.`);
    }
  );

  const showLastIssueDisposable = vscode.commands.registerCommand(
    "oneTruthCue.showLastIssue",
    () => {
      if (!lastIssue) {
        vscode.window.showInformationMessage("One Truth Cue: no issue has been detected yet.");
        return;
      }

      vscode.window.showInformationMessage(truncateMiddle(formatIssue(lastIssue), 500));
    }
  );

  context.subscriptions.push(
    startDisposable,
    endDisposable,
    testErrorDisposable,
    testWarningDisposable,
    testSuccessDisposable,
    selectSoundModeDisposable,
    nextSoundModeDisposable,
    toggleDisposable,
    showLastIssueDisposable
  );
}

export function deactivate(): void {}

async function collectExecutionOutput(
  execution: vscode.TerminalShellExecution,
  state: RunningExecution,
  maxOutputChars: number
): Promise<void> {
  try {
    const stream = execution.read();

    for await (const chunk of stream) {
      state.output += stripAnsi(chunk);

      if (state.output.length > maxOutputChars) {
        state.output = state.output.slice(-maxOutputChars);
      }
    }
  } catch {
    // Some shells or VS Code environments may not provide readable output.
    // Exit-code based detection still works when available.
  }
}

async function handleExecutionEnd(
  event: vscode.TerminalShellExecutionEndEvent,
  soundPlayer: SoundPlayer
): Promise<void> {
  const config = getConfig();

  if (!config.enabled) {
    return;
  }

  const command = event.execution.commandLine.value;

  if (shouldIgnoreCommand(command, config.ignoredCommands)) {
    return;
  }

  const state = runningExecutions.get(event.execution);
  const output = state?.output ?? "";
  const soundFiles = getSoundFiles(config);

  const issue = classifyTerminalIssue({
    output,
    command,
    exitCode: event.exitCode,
    includeWarnings: config.includeWarnings,
    treatUnknownExitCodeAsError: config.treatUnknownExitCodeAsError
  });

  if (!issue) {
    if (config.playOnSuccess && event.exitCode === 0) {
      await soundPlayer.play(soundFiles.successSoundFile, config.cooldownMs);
    }

    return;
  }

  lastIssue = issue;

  const soundFile = issue.kind === "warning" ? soundFiles.warningSoundFile : soundFiles.errorSoundFile;
  await soundPlayer.play(soundFile, config.cooldownMs);

  if (config.showNotification) {
    vscode.window.showWarningMessage(truncateMiddle(formatIssue(issue), 500));
  }
}

function shouldIgnoreCommand(command: string, ignoredCommands: string[]): boolean {
  const normalizedCommand = command.toLowerCase();

  return ignoredCommands.some((ignored) => {
    const normalizedIgnored = ignored.toLowerCase().trim();
    return normalizedIgnored.length > 0 && normalizedCommand.includes(normalizedIgnored);
  });
}

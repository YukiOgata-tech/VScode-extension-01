import * as vscode from "vscode";
import { classifyTerminalIssue, formatIssue } from "./classifier";
import {
  getConfig,
  getSoundFiles,
  selectSoundMode,
  setSoundMode,
  switchToNextSoundMode,
  toggleEnabled,
  toggleIncludeWarnings,
  togglePlayOnStart,
  togglePlayOnSuccess
} from "./config";
import { SoundPlayer } from "./sound";
import { TerminalIssue } from "./types";
import { stripAnsi, truncateMiddle } from "./utils";

type RunningExecution = {
  output: string;
  playedStartSound: boolean;
};

const runningExecutions = new WeakMap<vscode.TerminalShellExecution, RunningExecution>();

let lastIssue: TerminalIssue | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const soundPlayer = new SoundPlayer(context);

  const startDisposable = vscode.window.onDidStartTerminalShellExecution((event) => {
    const config = getConfig();
    const command = event.execution.commandLine.value;
    const soundFiles = getSoundFiles(config);
    const shouldPlayStartSound =
      config.enabled &&
      config.playOnStart &&
      !!soundFiles.startSoundFile &&
      !shouldIgnoreCommand(command, config.ignoredCommands);
    const state: RunningExecution = { output: "", playedStartSound: shouldPlayStartSound };
    runningExecutions.set(event.execution, state);

    if (shouldPlayStartSound && soundFiles.startSoundFile) {
      void soundPlayer.play(soundFiles.startSoundFile, 0, {
        updateCooldown: false,
        interruptible: true
      });
    }

    void collectExecutionOutput(event.execution, state, config.maxOutputChars);
  });

  const endDisposable = vscode.window.onDidEndTerminalShellExecution((event) => {
    void handleExecutionEnd(event, soundPlayer);
  });

  const testErrorDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.testErrorSound",
    async () => {
      const soundFiles = getSoundFiles();
      await soundPlayer.play(soundFiles.errorSoundFile, 0);
    }
  );

  const testWarningDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.testWarningSound",
    async () => {
      const soundFiles = getSoundFiles();
      await soundPlayer.play(soundFiles.warningSoundFile, 0);
    }
  );

  const testSuccessDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.testSuccessSound",
    async () => {
      const soundFiles = getSoundFiles();
      await soundPlayer.play(soundFiles.successSoundFile, 0);
    }
  );

  const testStartDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.testStartSound",
    async () => {
      const soundFiles = getSoundFiles();
      if (!soundFiles.startSoundFile) {
        vscode.window.showInformationMessage("Terminal Hype Lines: current mode has no start sound.");
        return;
      }

      await soundPlayer.play(soundFiles.startSoundFile, 0);
    }
  );

  const selectSoundModeDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.selectSoundMode",
    async () => {
      const selectedMode = await selectSoundMode();
      if (selectedMode) {
        vscode.window.showInformationMessage(`Terminal Hype Lines: sound mode set to "${selectedMode}".`);
      }
    }
  );

  const nextSoundModeDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.nextSoundMode",
    async () => {
      const nextMode = await switchToNextSoundMode();
      if (nextMode) {
        vscode.window.showInformationMessage(`Terminal Hype Lines: sound mode set to "${nextMode}".`);
      }
    }
  );

  const useMode1Disposable = vscode.commands.registerCommand(
    "terminalHypeLines.useMode1",
    async () => {
      await setSoundMode("mode1");
      vscode.window.showInformationMessage('Terminal Hype Lines: sound mode set to "mode1".');
    }
  );

  const useModeJujutsuDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.useModeJujutsu",
    async () => {
      await setSoundMode("mode_jujutsu");
      vscode.window.showInformationMessage('Terminal Hype Lines: sound mode set to "mode_jujutsu".');
    }
  );

  const toggleDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.toggleEnabled",
    async () => {
      const enabled = await toggleEnabled();
      vscode.window.showInformationMessage(`Terminal Hype Lines: ${enabled ? "enabled" : "disabled"}.`);
    }
  );

  const toggleStartDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.toggleStartCue",
    async () => {
      const enabled = await togglePlayOnStart();
      vscode.window.showInformationMessage(`Terminal Hype Lines: start sound ${enabled ? "enabled" : "disabled"}.`);
    }
  );

  const toggleSuccessDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.toggleSuccessCue",
    async () => {
      const enabled = await togglePlayOnSuccess();
      vscode.window.showInformationMessage(`Terminal Hype Lines: success sound ${enabled ? "enabled" : "disabled"}.`);
    }
  );

  const toggleWarningDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.toggleWarningCue",
    async () => {
      const enabled = await toggleIncludeWarnings();
      vscode.window.showInformationMessage(`Terminal Hype Lines: warning sound ${enabled ? "enabled" : "disabled"}.`);
    }
  );

  const showLastIssueDisposable = vscode.commands.registerCommand(
    "terminalHypeLines.showLastIssue",
    () => {
      if (!lastIssue) {
        vscode.window.showInformationMessage("Terminal Hype Lines: no issue has been detected yet.");
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
    testStartDisposable,
    selectSoundModeDisposable,
    nextSoundModeDisposable,
    useMode1Disposable,
    useModeJujutsuDisposable,
    toggleDisposable,
    toggleStartDisposable,
    toggleSuccessDisposable,
    toggleWarningDisposable,
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
  const resultCooldownMs = state?.playedStartSound ? 0 : config.cooldownMs;

  if (state?.playedStartSound) {
    soundPlayer.stopInterruptibleSound();
  }

  const issue = classifyTerminalIssue({
    output,
    command,
    exitCode: event.exitCode,
    includeWarnings: config.includeWarnings,
    treatUnknownExitCodeAsError: config.treatUnknownExitCodeAsError
  });

  if (!issue) {
    if (config.playOnSuccess && event.exitCode === 0) {
      await soundPlayer.play(soundFiles.successSoundFile, resultCooldownMs);
    }

    return;
  }

  lastIssue = issue;

  const soundFile = issue.kind === "warning" ? soundFiles.warningSoundFile : soundFiles.errorSoundFile;
  await soundPlayer.play(soundFile, resultCooldownMs);

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

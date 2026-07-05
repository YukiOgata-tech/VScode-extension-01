import * as vscode from "vscode";
import { ExtensionConfig, SoundModeConfig } from "./types";

export type ResolvedSoundFiles = {
  modeName: string;
  errorSoundFile: string;
  warningSoundFile: string;
  successSoundFile: string;
};

export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration("terminalErrorSound");

  return {
    enabled: config.get<boolean>("enabled", true),
    playOnSuccess: config.get<boolean>("playOnSuccess", false),
    includeWarnings: config.get<boolean>("includeWarnings", false),
    treatUnknownExitCodeAsError: config.get<boolean>("treatUnknownExitCodeAsError", false),
    showNotification: config.get<boolean>("showNotification", false),
    errorSoundFile: config.get<string>("errorSoundFile", "error.mp3"),
    warningSoundFile: config.get<string>("warningSoundFile", "warning.mp3"),
    successSoundFile: config.get<string>("successSoundFile", "warning.mp3"),
    cooldownMs: config.get<number>("cooldownMs", 800),
    maxOutputChars: config.get<number>("maxOutputChars", 60000),
    ignoredCommands: config.get<string[]>("ignoredCommands", []),
    soundMode: config.get<string>("soundMode", "default"),
    soundModes: config.get<Record<string, SoundModeConfig>>("soundModes", {
      default: {
        errorSoundFile: "mode1/error.mp3",
        warningSoundFile: "mode1/warning.mp3",
        successSoundFile: "mode1/success.mp3"
      },
      mode1: {
        errorSoundFile: "mode1/error.mp3",
        warningSoundFile: "mode1/warning.mp3",
        successSoundFile: "mode1/success.mp3"
      },
      mode2: {
        errorSoundFile: "mode2/error.mp3",
        warningSoundFile: "mode2/warning.mp3",
        successSoundFile: "mode2/success.mp3"
      }
    })
  };
}

export function getSoundFiles(config = getConfig()): ResolvedSoundFiles {
  const modeName = config.soundMode.trim() || "default";
  const mode = config.soundModes[modeName];

  return {
    modeName,
    errorSoundFile: mode?.errorSoundFile ?? config.errorSoundFile,
    warningSoundFile: mode?.warningSoundFile ?? config.warningSoundFile,
    successSoundFile: mode?.successSoundFile ?? config.successSoundFile
  };
}

export function getSoundModeNames(config = getConfig()): string[] {
  const names = Object.keys(config.soundModes)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (!names.includes(config.soundMode)) {
    names.unshift(config.soundMode);
  }

  return Array.from(new Set(names));
}

export async function setSoundMode(modeName: string): Promise<void> {
  const config = vscode.workspace.getConfiguration("terminalErrorSound");
  await config.update("soundMode", modeName, vscode.ConfigurationTarget.Global);
}

export async function selectSoundMode(): Promise<string | undefined> {
  const config = getConfig();
  const currentFiles = getSoundFiles(config);
  const selected = await vscode.window.showQuickPick(
    getSoundModeNames(config).map((name) => ({
      label: name,
      description: name === currentFiles.modeName ? "current" : undefined
    })),
    { placeHolder: "Select a terminal sound mode" }
  );

  if (!selected) {
    return undefined;
  }

  await setSoundMode(selected.label);
  return selected.label;
}

export async function switchToNextSoundMode(): Promise<string | undefined> {
  const config = getConfig();
  const modes = getSoundModeNames(config);

  if (modes.length === 0) {
    return undefined;
  }

  const currentIndex = modes.indexOf(config.soundMode);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % modes.length : 0;
  const nextMode = modes[nextIndex];

  await setSoundMode(nextMode);
  return nextMode;
}

export async function toggleEnabled(): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("terminalErrorSound");
  const current = config.get<boolean>("enabled", true);
  const next = !current;

  await config.update("enabled", next, vscode.ConfigurationTarget.Global);

  return next;
}

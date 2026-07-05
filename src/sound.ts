import * as path from "path";
import * as vscode from "vscode";
import soundPlay from "sound-play";

export class SoundPlayer {
  private lastPlayedAt = 0;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async play(fileName: string, cooldownMs = 800): Promise<void> {
    const now = Date.now();

    if (cooldownMs > 0 && now - this.lastPlayedAt < cooldownMs) {
      return;
    }

    this.lastPlayedAt = now;

    const safeFileName = normalizeMediaPath(fileName);

    if (!safeFileName) {
      vscode.window.showWarningMessage(`One Truth Cue: invalid sound file path "${fileName}".`);
      return;
    }

    const audioPath = path.join(this.context.extensionPath, "media", safeFileName);

    try {
      await soundPlay.play(audioPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(
        `One Truth Cue: failed to play "${safeFileName}". ${message}`
      );
    }
  }
}

function normalizeMediaPath(fileName: string): string | undefined {
  const normalized = fileName.replace(/\\/g, "/").trim();

  if (
    normalized.length === 0 ||
    path.isAbsolute(normalized) ||
    normalized.split("/").includes("..")
  ) {
    return undefined;
  }

  return normalized;
}

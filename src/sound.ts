import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import * as vscode from "vscode";

type PlayOptions = {
  updateCooldown?: boolean;
  interruptible?: boolean;
};

export class SoundPlayer {
  private lastPlayedAt = 0;
  private activeInterruptibleProcess: ChildProcess | undefined;
  private stoppedInterruptibleProcesses = new WeakSet<ChildProcess>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  stopInterruptibleSound(): void {
    if (!this.activeInterruptibleProcess || this.activeInterruptibleProcess.killed) {
      this.activeInterruptibleProcess = undefined;
      return;
    }

    this.stoppedInterruptibleProcesses.add(this.activeInterruptibleProcess);
    this.activeInterruptibleProcess.kill();
    this.activeInterruptibleProcess = undefined;
  }

  async play(fileName: string, cooldownMs = 800, options: PlayOptions = {}): Promise<void> {
    const now = Date.now();

    if (cooldownMs > 0 && now - this.lastPlayedAt < cooldownMs) {
      return;
    }

    if (options.updateCooldown !== false) {
      this.lastPlayedAt = now;
    }

    const safeFileName = normalizeMediaPath(fileName);

    if (!safeFileName) {
      vscode.window.showWarningMessage(`Terminal Hype Lines: invalid sound file path "${fileName}".`);
      return;
    }

    const audioPath = path.join(this.context.extensionPath, "media", safeFileName);
    let playback: { process: ChildProcess; done: Promise<void> } | undefined;

    try {
      if (options.interruptible) {
        this.stopInterruptibleSound();
      }

      playback = playAudio(audioPath);

      if (options.interruptible) {
        this.activeInterruptibleProcess = playback.process;
      }

      await playback.done;
    } catch (error) {
      if (
        options.interruptible &&
        playback &&
        this.stoppedInterruptibleProcesses.has(playback.process)
      ) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(
        `Terminal Hype Lines: failed to play "${safeFileName}". ${message}`
      );
    } finally {
      if (options.interruptible && this.activeInterruptibleProcess === playback?.process) {
        this.activeInterruptibleProcess = undefined;
      }
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

function playAudio(audioPath: string): { process: ChildProcess; done: Promise<void> } {
  if (process.platform === "darwin") {
    return spawnAudioProcess("afplay", [audioPath]);
  }

  if (process.platform === "win32") {
    return spawnAudioProcess("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      [
        "Add-Type -AssemblyName PresentationCore",
        "$player = New-Object System.Windows.Media.MediaPlayer",
        `$player.Open(${toPowerShellString(audioPath)})`,
        "$player.Volume = 0.5",
        "$player.Play()",
        "$deadline = (Get-Date).AddSeconds(2)",
        "while (-not $player.NaturalDuration.HasTimeSpan -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 50 }",
        "$sleepMs = if ($player.NaturalDuration.HasTimeSpan) { [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalMilliseconds) } else { 3000 }",
        "Start-Sleep -Milliseconds $sleepMs",
        "$player.Close()"
      ].join("; ")
    ]);
  }

  return spawnAudioProcess("sh", ["-c", `command -v paplay >/dev/null && paplay "$1" || aplay "$1"`, "sh", audioPath]);
}

function spawnAudioProcess(command: string, args: string[]): { process: ChildProcess; done: Promise<void> } {
  const child = spawn(command, args, { windowsHide: true });
  const done = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal || code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });

  return { process: child, done };
}

function toPowerShellString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

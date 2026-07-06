# Terminal Hype Lines

Terminal Hype Lines plays anime-inspired hype-line sound effects when VS Code terminal commands start, succeed, fail, or emit warnings.

## 日本語

Terminal Hype Lines は、VS Code のターミナルコマンドにあわせて、アニメの決め台詞っぽいハイプ感のある効果音を鳴らす拡張機能です。

- コマンド開始時、成功時、警告検出時、失敗時に音を鳴らします
- `mode1` と `mode_jujutsu` のサウンドモードを切り替えられます
- `mode_jujutsu` ではコマンド開始時の `start.mp3` も再生します
- 短いコマンドで開始音の直後に終了しても、成功/警告/失敗の結果音が続けて鳴るようにしています
- コマンドパレットからモード切り替えや各音のテスト、ON/OFF切り替えができます

## What it does

- Watches terminal command completion through VS Code Terminal Shell Integration
- Plays start sounds for modes that define `startSoundFile`
- Plays result sounds for success, warning, and error outcomes
- Lets you switch between named sound modes from the command palette
- Keeps result sounds from being suppressed when a command finishes immediately after a start sound
- Detects common terminal failure patterns from output text:
  - command not found
  - permission denied
  - syntax error
  - runtime exception
  - test failure
  - build failure
  - package manager error
  - git command failure

## Requirements

This extension depends on VS Code Terminal Shell Integration.

If Shell Integration is disabled or unsupported by the current shell, the extension may not receive command-level events or exit codes.

## Commands

Use these commands from the command palette:

- `Terminal Hype Lines: Select Sound Mode`
- `Terminal Hype Lines: Switch to Next Sound Mode`
- `Terminal Hype Lines: Use Mode mode1`
- `Terminal Hype Lines: Use Mode mode_jujutsu`
- `Terminal Hype Lines: Test Start Sound`
- `Terminal Hype Lines: Test Error Sound`
- `Terminal Hype Lines: Test Warning Sound`
- `Terminal Hype Lines: Test Success Sound`
- `Terminal Hype Lines: Toggle All Sounds`
- `Terminal Hype Lines: Toggle Start Sound`
- `Terminal Hype Lines: Toggle Success Sound`
- `Terminal Hype Lines: Toggle Warning Sound`

## Settings

| Setting | Default | Description |
|---|---:|---|
| `terminalHypeLines.enabled` | `true` | Enable the extension |
| `terminalHypeLines.playOnStart` | `true` | Play a start sound when the current mode defines one |
| `terminalHypeLines.playOnSuccess` | `true` | Play a sound for successful commands |
| `terminalHypeLines.includeWarnings` | `true` | Play a sound for warning-only output |
| `terminalHypeLines.treatUnknownExitCodeAsError` | `false` | Treat undefined exit code as an error |
| `terminalHypeLines.showNotification` | `false` | Show notification when an issue is detected |
| `terminalHypeLines.startSoundFile` | empty | Fallback start sound file under `media/` |
| `terminalHypeLines.errorSoundFile` | `error.mp3` | Fallback error sound file under `media/` |
| `terminalHypeLines.warningSoundFile` | `warning.mp3` | Fallback warning sound file under `media/` |
| `terminalHypeLines.successSoundFile` | `warning.mp3` | Fallback success sound file under `media/` |
| `terminalHypeLines.soundMode` | `default` | Active sound mode |
| `terminalHypeLines.soundModes` | object | Named sound mode definitions |
| `terminalHypeLines.cooldownMs` | `800` | Minimum interval between sounds |
| `terminalHypeLines.maxOutputChars` | `60000` | Maximum output kept per command |
| `terminalHypeLines.ignoredCommands` | `[]` | Command substrings to ignore |

## Sound modes

Current bundled modes:

```json
{
  "terminalHypeLines.soundMode": "mode1",
  "terminalHypeLines.soundModes": {
    "mode1": {
      "errorSoundFile": "mode1/error.mp3",
      "warningSoundFile": "mode1/warning.mp3",
      "successSoundFile": "mode1/success.mp3"
    },
    "mode_jujutsu": {
      "startSoundFile": "mode_jujutsu/start.mp3",
      "errorSoundFile": "mode_jujutsu/error.mp3",
      "warningSoundFile": "mode_jujutsu/warn.mp3",
      "successSoundFile": "mode_jujutsu/success.mp3"
    }
  }
}
```

Add more folders under `media/` and point `terminalHypeLines.soundModes` at those files when you want more modes.

## Development

```bash
npm install
npm run compile
npm run lint
```

Open this folder in VS Code and press `F5`.

## Packaging

```bash
vsce package
```

## License

MIT

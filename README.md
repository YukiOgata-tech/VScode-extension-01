# One Truth Cue

One Truth Cue is a small VS Code extension that plays character-style sound cues when a VS Code terminal command succeeds, fails, or emits warnings.

## What it does

- Watches terminal command completion through VS Code Terminal Shell Integration
- Plays a sound when the command exit code is non-zero
- Optionally plays a sound when the command succeeds
- Switches between named sound modes from the command palette
- Detects common terminal failure patterns from output text:
  - command not found
  - permission denied
  - syntax error
  - runtime exception
  - test failure
  - build failure
  - package manager error
  - git command failure
- Optional warning detection

## Requirements

This extension depends on VS Code Terminal Shell Integration.

If Shell Integration is disabled or unsupported by the current shell, the extension may not receive command-level events or exit codes.

## Development

```bash
npm install
npm run compile
```

Open this folder in VS Code and press `F5`.

In the Extension Development Host window, run a failing command:

```bash
npm run this-script-does-not-exist
```

or:

```bash
node -e "throw new Error('boom')"
```

## Settings

| Setting | Default | Description |
|---|---:|---|
| `oneTruthCue.enabled` | `true` | Enable the extension |
| `oneTruthCue.playOnSuccess` | `false` | Play a sound for successful commands |
| `oneTruthCue.includeWarnings` | `false` | Play a sound for warning-only output |
| `oneTruthCue.treatUnknownExitCodeAsError` | `false` | Treat undefined exit code as an error |
| `oneTruthCue.showNotification` | `false` | Show notification when an issue is detected |
| `oneTruthCue.errorSoundFile` | `error.mp3` | Error sound file under `media/` |
| `oneTruthCue.warningSoundFile` | `warning.mp3` | Warning sound file under `media/` |
| `oneTruthCue.successSoundFile` | `warning.mp3` | Success sound file under `media/` |
| `oneTruthCue.soundMode` | `default` | Active cue mode |
| `oneTruthCue.soundModes` | object | Named cue mode definitions |
| `oneTruthCue.cooldownMs` | `800` | Minimum interval between sounds |
| `oneTruthCue.maxOutputChars` | `60000` | Maximum output kept per command |
| `oneTruthCue.ignoredCommands` | `[]` | Command substrings to ignore |

## Sound modes

Use these commands from the command palette:

- `One Truth Cue: Select Cue Mode`
- `One Truth Cue: Next Cue Mode`

Example settings:

```json
{
  "oneTruthCue.soundMode": "mode1",
  "oneTruthCue.soundModes": {
    "mode1": {
      "errorSoundFile": "mode1/error.mp3",
      "warningSoundFile": "mode1/warning.mp3",
      "successSoundFile": "mode1/success.mp3"
    },
    "mode2": {
      "errorSoundFile": "mode2/error.mp3",
      "warningSoundFile": "mode2/warning.mp3",
      "successSoundFile": "mode2/success.mp3"
    }
  }
}
```

## Audio files

Put your own files here:

```txt
media/mode1/error.mp3
media/mode1/warning.mp3
media/mode1/success.mp3
```

Add more folders such as `media/mode2/` and point `oneTruthCue.soundModes` at those files when you want more modes.

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

## Publishing

1. Create a publisher on Visual Studio Marketplace.
2. Create an Azure DevOps Personal Access Token.
3. Login and publish:

```bash
vsce login your-publisher-id
vsce publish
```

## License

MIT

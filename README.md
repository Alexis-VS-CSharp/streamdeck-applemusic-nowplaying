*English · [Français](README.fr.md)*

# Apple Music Now Playing — Stream Deck plugin

Windows Stream Deck plugin to control **Apple Music for Windows** from a Stream Deck / Stream Deck+ / keyboard with built-in screens (e.g. Corsair Galleon 100 SD).

## Features

### "Now Playing" dial (Stream Deck+ / encoder screen)
- Full-bleed album cover background, with a pause overlay when playback is paused.
- Title and artist(s), with smooth circular scrolling when the text overflows the screen (2s pause on every loop).
- Multiple artists automatically reformatted as `Main artist feat. Second, Third`.
- Progress bar (elapsed time / total track duration).
- **Single click** = play/pause · **double click** = next track · **triple click** = previous track.
- **Rotate** the dial = next/previous track.
- **Touch tap** = play/pause.

### Buttons (Keypad)
- Play/Pause, Previous track, Next track.
- Volume + / Volume - / Mute — act directly on Apple Music's audio session in the **Windows volume mixer** (not the global system volume).
- Launch a playlist/album: a button whose icon is the cover art (full-bleed, no text) that opens and **actually starts** playback in the Apple Music app (not just a link that opens a browser).

## Requirements

- Windows 10/11.
- [Stream Deck software](https://www.elgato.com/downloads) 6.5+.
- [Apple Music for Windows](https://apps.microsoft.com/detail/9pfhdd62mxs1) (Microsoft Store), installed and signed in.
- [Node.js 20+](https://nodejs.org/).
- To rebuild the C# bridge (optional, a precompiled binary is already included): no extra install needed, `csc.exe` and the required `.winmd` files ship with Windows.

## Simple install (no dev tools)

Download [`com.alexismartin.applemusic-nowplaying.streamDeckPlugin`](com.alexismartin.applemusic-nowplaying.streamDeckPlugin) and double-click it: Stream Deck installs it automatically.

## Local install (dev)

```bash
git clone https://github.com/Alexis-VS-CSharp/streamdeck-applemusic-nowplaying.git
cd streamdeck-applemusic-nowplaying
npm install
npm run build
```

Then link the plugin to Stream Deck:

```bash
npx streamdeck link com.alexismartin.applemusic-nowplaying.sdPlugin
```

Restart the Stream Deck app (or `npx streamdeck restart com.alexismartin.applemusic-nowplaying`). The actions appear under the **Apple Music Now Playing** category.

### Dev mode (rebuild + auto-restart)

```bash
npm run watch
```

### Rebuilding the C# bridge (`NowPlayingBridge.exe`)

Only needed if you modify [`build-bridge/NowPlayingBridge.cs`](build-bridge/NowPlayingBridge.cs):

```powershell
powershell -File build-bridge/build.ps1
```

The compiled binary is automatically copied into `com.alexismartin.applemusic-nowplaying.sdPlugin/resources/`.

### Regenerating the `.streamDeckPlugin`

```bash
npm run pack
```

## How it works

- Title/artist/cover/position are read via Windows **SMTC** (`Windows.Media.Control`), the same API behind Windows' native "now playing" widget.
- Volume/mute act on Apple Music's audio session via **Core Audio** (`ISimpleAudioVolume`) — the programmatic equivalent of the per-app slider in *Settings > System > Sound > Volume mixer*.
- Launching a playlist/album opens the link via the `music://` protocol (which routes to the app instead of the browser), then clicks the app's Play button via UI Automation.
- All this Windows bridging (SMTC / Core Audio / UI Automation) is a small C# executable (`NowPlayingBridge.exe`) queried by the Node/TypeScript plugin.

## Known limitations

- Shuffle and Repeat can't be controlled: Apple Music for Windows doesn't expose these commands via SMTC (a limitation of the app itself, not the plugin).
- If audio is routed through third-party mixing software (e.g. SteelSeries Sonar) that remixes it internally after Windows, volume control acts on the Windows session (the "source" layer), not on any internal fader of that software.

## License

[MIT](LICENSE) — except for the Apple Music icons themselves (`imgs/`), which remain the property of Apple Inc. and are used solely for identification purposes.

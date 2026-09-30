# Graph Report - streamdeck-applemusic-nowplaying  (2026-09-30)

## Corpus Check
- 20 files · ~9,694 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .exe 2, .WinMD 1)

## Summary
- 290 nodes · 450 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c73c36e6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- plugin.ts
- IAudioSessionControl2
- NowPlayingBridge.cs
- now-playing.ts
- package.json
- Apple Music Now Playing README (English)
- make-icons.mjs
- manifest.json
- NowPlayingBridge
- compilerOptions
- Apple Music Now Playing README (French)
- com.alexisvscsharp.nowplaying.sdPlugin/package.json

## God Nodes (most connected - your core abstractions)
1. `Apple Music Now Playing README (English)` - 19 edges
2. `IAudioSessionControl2` - 15 edges
3. `Apple Music Now Playing README (French)` - 15 edges
4. `NowPlayingAction` - 13 edges
5. `compilerOptions` - 13 edges
6. `nowPlayingService` - 12 edges
7. `IAudioSessionControl` - 11 edges
8. `withBrandBackground()` - 10 edges
9. `NowPlayingBridge` - 10 edges
10. `@elgato/streamdeck` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Apple Music Now Playing README (English)` --references--> `Apple Music Now Playing README (French)`  [EXTRACTED]
  README.md → README.fr.md
- `fits()` --calls--> `textWidthPx()`  [EXTRACTED]
  src/actions/now-playing.ts → src/text-metrics.ts
- `scrollText()` --calls--> `textWidthPx()`  [EXTRACTED]
  src/actions/now-playing.ts → src/text-metrics.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Windows Bridging via NowPlayingBridge.exe (French)** — readme_fr_nowplayingbridge_exe, readme_fr_smtc, readme_fr_core_audio, readme_fr_ui_automation [EXTRACTED 1.00]
- **Launch Playlist/Album Playback Flow** — readme_launch_playlist_album, readme_music_protocol, readme_ui_automation [EXTRACTED 1.00]
- **Windows Bridging via NowPlayingBridge.exe (English)** — readme_nowplayingbridge_exe, readme_smtc, readme_core_audio, readme_ui_automation [EXTRACTED 1.00]

## Communities (12 total, 1 thin omitted)

### Community 0 - "plugin.ts"
Cohesion: 0.07
Nodes (22): @elgato/streamdeck, ref_node_child_process, ref_node_events, ref_node_path, ref_node_readline, MuteAction, action, BRIDGE_PATH (+14 more)

### Community 1 - "IAudioSessionControl2"
Cohesion: 0.07
Nodes (6): IAudioSessionControl, IAudioSessionControl2, IAudioSessionManager2, ISimpleAudioVolume, Guid, IntPtr

### Community 2 - "NowPlayingBridge.cs"
Cohesion: 0.09
Nodes (14): AppleMusicVolume, IAudioSessionEnumerator, IMMDevice, IMMDeviceCollection, IMMDeviceEnumerator, List, system, system_collections_generic (+6 more)

### Community 3 - "now-playing.ts"
Cohesion: 0.10
Nodes (20): ARTIST_SPEC, cleanArtist(), DialState, FieldState, fits(), formatArtists(), formatTime(), makeFieldState() (+12 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, @elgato/streamdeck, description, devDependencies, @elgato/cli, @resvg/resvg-js, rollup, @rollup/plugin-commonjs (+26 more)

### Community 5 - "Apple Music Now Playing README (English)"
Cohesion: 0.18
Nodes (17): Apple Music Now Playing README (English), Apple Music for Windows, Core Audio (ISimpleAudioVolume), Corsair Galleon 100 SD, Keypad Buttons Feature, Launch Playlist/Album Button Feature, MIT License (excluding Apple Music icons), music:// Protocol (+9 more)

### Community 6 - "make-icons.mjs"
Cohesion: 0.18
Nodes (21): ref_node_zlib, chunk(), crc32(), CRC_TABLE, drawSpeaker(), encodePng(), makeCanvas(), muteIcon() (+13 more)

### Community 7 - "manifest.json"
Cohesion: 0.12
Nodes (16): Actions, Author, Category, CategoryIcon, CodePath, Description, Icon, Name (+8 more)

### Community 8 - "NowPlayingBridge"
Cohesion: 0.23
Nodes (7): EntryPoint, NowPlayingBridge, GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager, IAsyncOperation, IAsyncOperationWithProgress, StringBuilder

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+6 more)

### Community 10 - "Apple Music Now Playing README (French)"
Cohesion: 0.23
Nodes (13): Apple Music Now Playing README (French), Apple Music for Windows, Core Audio (ISimpleAudioVolume), Keypad Buttons Feature, Launch Playlist/Album Button Feature, music:// Protocol, Now Playing Dial Feature, NowPlayingBridge.exe (+5 more)

## Knowledge Gaps
- **75 isolated node(s):** `Name`, `Author`, `UUID`, `Icon`, `Description` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 122 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@elgato/streamdeck` connect `plugin.ts` to `now-playing.ts`, `package.json`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `Apple Music Now Playing README (English)` connect `Apple Music Now Playing README (English)` to `NowPlayingBridge.cs`, `Apple Music Now Playing README (French)`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `IAudioSessionControl2` connect `IAudioSessionControl2` to `NowPlayingBridge.cs`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `Name`, `Author`, `UUID` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `plugin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07246376811594203 - nodes in this community are weakly interconnected._
- **Should `IAudioSessionControl2` be split into smaller, more focused modules?**
  _Cohesion score 0.07152496626180836 - nodes in this community are weakly interconnected._
- **Should `NowPlayingBridge.cs` be split into smaller, more focused modules?**
  _Cohesion score 0.0928030303030303 - nodes in this community are weakly interconnected._
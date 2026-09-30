# Graph Report - streamdeck-applemusic-nowplaying  (2026-09-28)

## Corpus Check
- Corpus is ~9,661 words - fits in a single context window. You may not need a graph.

## Summary
- 319 nodes · 457 edges · 36 communities (12 shown, 24 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Plugin Actions & Dependencies
- Core Audio Session Interfaces
- Volume Control & Audio Devices
- Now Playing Dial Action
- Package Manifest
- Plugin UI & Build Docs
- Icon Generation Script
- Stream Deck Manifest
- Bridge Entry Point & SMTC
- TypeScript Config
- French README
- Dev Dependencies
- SD Plugin Package Type
- Mute Icon (2x)
- Mute Icon
- Next Icon (2x)
- Next Icon
- Pause Icon (2x)
- Pause Icon
- Play Icon
- Play Icon (2x)
- Previous Icon (2x)
- Previous Icon
- Unmute Icon (2x)
- Unmute Icon
- Volume Down Icon (2x)
- Volume Down Icon
- Volume Up Icon (2x)
- Volume Up Icon
- Now Playing Key Icon (2x)
- Now Playing Key Icon
- Now Playing Key Art
- Now Playing Key Art (2x)
- Pause Overlay Art
- Category Icon (2x)
- Category Icon

## God Nodes (most connected - your core abstractions)
1. `Apple Music Now Playing README (English)` - 19 edges
2. `IAudioSessionControl2` - 15 edges
3. `Apple Music Now Playing README (French)` - 15 edges
4. `NowPlayingAction` - 13 edges
5. `compilerOptions` - 13 edges
6. `nowPlayingService` - 12 edges
7. `IAudioSessionControl` - 11 edges
8. `NowPlayingBridge` - 10 edges
9. `withBrandBackground()` - 10 edges
10. `IMMDevice` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Apple Music Now Playing README (English)` --references--> `Apple Music Now Playing README (French)`  [EXTRACTED]
  README.md → README.fr.md
- `Now Playing Property Inspector UI` --conceptually_related_to--> `Now Playing Dial Feature`  [INFERRED]
  com.alexismartin.applemusic-nowplaying.sdPlugin/ui/now-playing.html → README.md
- `Play Media Property Inspector UI` --conceptually_related_to--> `Launch Playlist/Album Button Feature`  [INFERRED]
  com.alexismartin.applemusic-nowplaying.sdPlugin/ui/play-media.html → README.md
- `sdpi-components.js Library` --shares_data_with--> `sdpi-components.js Library`  [INFERRED]
  com.alexismartin.applemusic-nowplaying.sdPlugin/ui/now-playing.html → com.alexismartin.applemusic-nowplaying.sdPlugin/ui/play-media.html
- `fits()` --calls--> `textWidthPx()`  [EXTRACTED]
  src/actions/now-playing.ts → src/text-metrics.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Windows Bridging via NowPlayingBridge.exe (French)** — readme_fr_nowplayingbridge_exe, readme_fr_smtc, readme_fr_core_audio, readme_fr_ui_automation [EXTRACTED 1.00]
- **Windows Bridging via NowPlayingBridge.exe (English)** — readme_nowplayingbridge_exe, readme_smtc, readme_core_audio, readme_ui_automation [EXTRACTED 1.00]
- **Launch Playlist/Album Playback Flow** — readme_launch_playlist_album, readme_music_protocol, readme_ui_automation [EXTRACTED 1.00]

## Communities (36 total, 24 thin omitted)

### Community 0 - "Plugin Actions & Dependencies"
Cohesion: 0.07
Nodes (22): @elgato/streamdeck, ref_node_child_process, ref_node_events, ref_node_path, ref_node_readline, MuteAction, action, BRIDGE_PATH (+14 more)

### Community 1 - "Core Audio Session Interfaces"
Cohesion: 0.07
Nodes (6): IAudioSessionControl, IAudioSessionControl2, IAudioSessionManager2, ISimpleAudioVolume, Guid, IntPtr

### Community 2 - "Volume Control & Audio Devices"
Cohesion: 0.09
Nodes (14): AppleMusicVolume, IAudioSessionEnumerator, IMMDevice, IMMDeviceCollection, IMMDeviceEnumerator, List, system, system_collections_generic (+6 more)

### Community 3 - "Now Playing Dial Action"
Cohesion: 0.10
Nodes (20): ARTIST_SPEC, cleanArtist(), DialState, FieldState, fits(), formatArtists(), formatTime(), makeFieldState() (+12 more)

### Community 4 - "Package Manifest"
Cohesion: 0.08
Nodes (24): dependencies, @elgato/streamdeck, description, license, name, private, scripts, build (+16 more)

### Community 5 - "Plugin UI & Build Docs"
Cohesion: 0.13
Nodes (23): Now Playing Property Inspector UI, Filter Setting (app filter textfield), sdpi-components.js Library, Play Media Property Inspector UI, sdpi-components.js Library, URL Setting (Apple Music link textfield), Apple Music Now Playing README (English), Apple Music for Windows (+15 more)

### Community 6 - "Icon Generation Script"
Cohesion: 0.18
Nodes (21): ref_node_zlib, chunk(), crc32(), CRC_TABLE, drawSpeaker(), encodePng(), makeCanvas(), muteIcon() (+13 more)

### Community 7 - "Stream Deck Manifest"
Cohesion: 0.12
Nodes (16): Actions, Author, Category, CategoryIcon, CodePath, Description, Icon, Name (+8 more)

### Community 8 - "Bridge Entry Point & SMTC"
Cohesion: 0.23
Nodes (7): EntryPoint, NowPlayingBridge, GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager, IAsyncOperation, IAsyncOperationWithProgress, StringBuilder

### Community 9 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+6 more)

### Community 10 - "French README"
Cohesion: 0.23
Nodes (13): Apple Music Now Playing README (French), Apple Music for Windows, Core Audio (ISimpleAudioVolume), Keypad Buttons Feature, Launch Playlist/Album Button Feature, music:// Protocol, Now Playing Dial Feature, NowPlayingBridge.exe (+5 more)

### Community 11 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @elgato/cli, @resvg/resvg-js, rollup, @rollup/plugin-commonjs, @rollup/plugin-node-resolve, @rollup/plugin-terser, @rollup/plugin-typescript (+2 more)

## Knowledge Gaps
- **100 isolated node(s):** `Name`, `Author`, `UUID`, `Icon`, `Description` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 147 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@elgato/streamdeck` connect `Plugin Actions & Dependencies` to `Now Playing Dial Action`, `Package Manifest`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Apple Music Now Playing README (English)` connect `Plugin UI & Build Docs` to `French README`, `Volume Control & Audio Devices`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `IAudioSessionControl2` connect `Core Audio Session Interfaces` to `Volume Control & Audio Devices`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `Name`, `Author`, `UUID` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Plugin Actions & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07246376811594203 - nodes in this community are weakly interconnected._
- **Should `Core Audio Session Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.07152496626180836 - nodes in this community are weakly interconnected._
- **Should `Volume Control & Audio Devices` be split into smaller, more focused modules?**
  _Cohesion score 0.0928030303030303 - nodes in this community are weakly interconnected._
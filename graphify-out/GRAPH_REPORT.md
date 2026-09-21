# Graph Report - streamdeck-applemusic-nowplaying  (2026-09-21)

## Corpus Check
- Corpus is ~9,497 words - fits in a single context window. You may not need a graph.

## Summary
- 318 nodes · 451 edges · 35 communities (11 shown, 24 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.83)
- Token cost: 0 input · 953,000 output

## Community Hubs (Navigation)
- Stream Deck Action Handlers
- Windows Audio Session Interop
- Node Build Tooling & Dependencies
- Windows Audio Device Enumeration
- Now Playing Dial Rendering
- Plugin Docs & Property Inspectors
- Icon Generation Script
- Stream Deck Manifest
- SMTC Bridge Entry Point
- TypeScript Config
- README (French)
- Plugin Package Metadata
- Mute Icon (2x)
- Mute Icon
- Next Icon (2x)
- Next Icon
- Pause Icon (2x)
- Pause Icon
- Play Icon
- Play Icon (2x)
- Prev Icon (2x)
- Prev Icon
- Unmute Icon (2x)
- Unmute Icon
- Volume Down Icon (2x)
- Volume Down Icon
- Volume Up Icon (2x)
- Volume Up Icon
- Now Playing Action Icon (2x)
- Now Playing Action Icon
- Now Playing Key Art
- Now Playing Key Art (2x)
- Pause Overlay Icon
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
8. `withBrandBackground()` - 10 edges
9. `NowPlayingBridge` - 8 edges
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
- **Windows Bridging via NowPlayingBridge.exe (English)** — readme_nowplayingbridge_exe, readme_smtc, readme_core_audio, readme_ui_automation [EXTRACTED 1.00]
- **Windows Bridging via NowPlayingBridge.exe (French)** — readme_fr_nowplayingbridge_exe, readme_fr_smtc, readme_fr_core_audio, readme_fr_ui_automation [EXTRACTED 1.00]
- **Launch Playlist/Album Playback Flow** — readme_launch_playlist_album, readme_music_protocol, readme_ui_automation [EXTRACTED 1.00]

## Communities (35 total, 24 thin omitted)

### Community 0 - "Stream Deck Action Handlers"
Cohesion: 0.07
Nodes (22): @elgato/streamdeck, ref_node_child_process, ref_node_events, ref_node_path, ref_node_readline, MuteAction, action, BRIDGE_PATH (+14 more)

### Community 1 - "Windows Audio Session Interop"
Cohesion: 0.07
Nodes (6): IAudioSessionControl, IAudioSessionControl2, IAudioSessionManager2, ISimpleAudioVolume, Guid, IntPtr

### Community 2 - "Node Build Tooling & Dependencies"
Cohesion: 0.06
Nodes (34): dependencies, @elgato/streamdeck, description, devDependencies, @elgato/cli, @resvg/resvg-js, rollup, @rollup/plugin-commonjs (+26 more)

### Community 3 - "Windows Audio Device Enumeration"
Cohesion: 0.09
Nodes (14): AppleMusicVolume, IAudioSessionEnumerator, IMMDevice, IMMDeviceCollection, IMMDeviceEnumerator, List, system, system_collections_generic (+6 more)

### Community 4 - "Now Playing Dial Rendering"
Cohesion: 0.10
Nodes (20): ARTIST_SPEC, cleanArtist(), DialState, FieldState, fits(), formatArtists(), formatTime(), makeFieldState() (+12 more)

### Community 5 - "Plugin Docs & Property Inspectors"
Cohesion: 0.13
Nodes (23): Now Playing Property Inspector UI, Filter Setting (app filter textfield), sdpi-components.js Library, Play Media Property Inspector UI, sdpi-components.js Library, URL Setting (Apple Music link textfield), Apple Music Now Playing README (English), Apple Music for Windows (+15 more)

### Community 6 - "Icon Generation Script"
Cohesion: 0.18
Nodes (21): ref_node_zlib, chunk(), crc32(), CRC_TABLE, drawSpeaker(), encodePng(), makeCanvas(), muteIcon() (+13 more)

### Community 7 - "Stream Deck Manifest"
Cohesion: 0.12
Nodes (16): Actions, Author, Category, CategoryIcon, CodePath, Description, Icon, Name (+8 more)

### Community 8 - "SMTC Bridge Entry Point"
Cohesion: 0.21
Nodes (7): EntryPoint, NowPlayingBridge, GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager, IAsyncOperation, IAsyncOperationWithProgress, StringBuilder

### Community 9 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+6 more)

### Community 10 - "README (French)"
Cohesion: 0.23
Nodes (13): Apple Music Now Playing README (French), Apple Music for Windows, Core Audio (ISimpleAudioVolume), Keypad Buttons Feature, Launch Playlist/Album Button Feature, music:// Protocol, Now Playing Dial Feature, NowPlayingBridge.exe (+5 more)

## Knowledge Gaps
- **100 isolated node(s):** `Name`, `Author`, `UUID`, `Icon`, `Description` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 148 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@elgato/streamdeck` connect `Stream Deck Action Handlers` to `Node Build Tooling & Dependencies`, `Now Playing Dial Rendering`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Apple Music Now Playing README (English)` connect `Plugin Docs & Property Inspectors` to `README (French)`, `Windows Audio Device Enumeration`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `IAudioSessionControl2` connect `Windows Audio Session Interop` to `Windows Audio Device Enumeration`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `Name`, `Author`, `UUID` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Stream Deck Action Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.07246376811594203 - nodes in this community are weakly interconnected._
- **Should `Windows Audio Session Interop` be split into smaller, more focused modules?**
  _Cohesion score 0.07152496626180836 - nodes in this community are weakly interconnected._
- **Should `Node Build Tooling & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05855855855855856 - nodes in this community are weakly interconnected._
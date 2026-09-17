# Apple Music Now Playing — plugin Stream Deck

Plugin Stream Deck (Windows) pour piloter **Apple Music for Windows** depuis un Stream Deck / Stream Deck+ / clavier avec écrans intégrés (ex: Corsair Galleon 100 SD).

## Fonctionnalités

### Dial "Now Playing" (Stream Deck+ / écran encodeur)
- Pochette d'album en fond plein écran, avec overlay pause quand la lecture est en pause.
- Titre et artiste(s) affichés, avec défilement circulaire fluide si le texte dépasse l'écran (pause de 2s à chaque boucle).
- Artistes multiples reformatés automatiquement en `Artiste principal feat. Second, Troisième`.
- Barre de progression (temps écoulé / durée totale du morceau).
- **Appui simple** = lecture/pause · **double clic** = piste suivante · **triple clic** = piste précédente.
- **Rotation** de la molette = piste suivante/précédente.
- **Tap tactile** = lecture/pause.

### Boutons (Keypad)
- Lecture / Pause, Piste précédente, Piste suivante.
- Volume + / Volume - / Muet — agissent directement sur la session audio d'Apple Music dans le **mixeur de volume Windows** (pas le volume système global).
- Lancer une playlist / album : bouton dont l'icône est la pochette (plein cadre, sans texte), qui ouvre et **démarre réellement** la lecture dans l'app Apple Music (pas juste un lien qui ouvre le navigateur).

## Prérequis

- Windows 10/11.
- [Stream Deck software](https://www.elgato.com/downloads) 6.5+.
- [Apple Music for Windows](https://apps.microsoft.com/detail/9pfhdd62mxs1) (Microsoft Store) installé et connecté.
- [Node.js 20+](https://nodejs.org/).
- Pour recompiler le bridge C# (optionnel, un binaire précompilé est déjà fourni) : aucune installation supplémentaire, `csc.exe` et les `.winmd` nécessaires sont fournis avec Windows.

## Installation simple (sans dev)

Télécharger le fichier [`com.alexismartin.applemusic-nowplaying.streamDeckPlugin`](com.alexismartin.applemusic-nowplaying.streamDeckPlugin) et double-cliquer dessus : Stream Deck l'installe automatiquement.

## Installation locale (dev)

```bash
git clone https://github.com/Alexis-VS-CSharp/streamdeck-applemusic-nowplaying.git
cd streamdeck-applemusic-nowplaying
npm install
npm run build
```

Puis lier le plugin au Stream Deck :

```bash
npx streamdeck link com.alexismartin.applemusic-nowplaying.sdPlugin
```

Redémarrer l'app Stream Deck (ou `npx streamdeck restart com.alexismartin.applemusic-nowplaying`). Les actions apparaissent dans la catégorie **Apple Music Now Playing**.

### Mode développement (rebuild + restart auto)

```bash
npm run watch
```

### Recompiler le bridge C# (`NowPlayingBridge.exe`)

Nécessaire uniquement si vous modifiez [`build-bridge/NowPlayingBridge.cs`](build-bridge/NowPlayingBridge.cs) :

```powershell
powershell -File build-bridge/build.ps1
```

Le binaire compilé est copié automatiquement dans `com.alexismartin.applemusic-nowplaying.sdPlugin/resources/`.

### Régénérer le `.streamDeckPlugin`

```bash
npm run pack
```

## Comment ça marche

- Le titre/artiste/pochette/position sont lus via les **SMTC** de Windows (`Windows.Media.Control`), la même API que le widget "lecture en cours" natif de Windows.
- Le volume/mute agit sur la session audio d'Apple Music via **Core Audio** (`ISimpleAudioVolume`) — l'équivalent programmatique du curseur par app dans *Paramètres > Système > Son > Mixeur de volume*.
- Lancer une playlist/album ouvre le lien via le protocole `music://` (qui route vers l'app plutôt que le navigateur) puis clique sur le bouton Play de l'app via UI Automation.
- Tout ce pontage Windows (SMTC / Core Audio / UI Automation) est un petit exécutable C# (`NowPlayingBridge.exe`) interrogé par le plugin Node/TypeScript.

## Limitations connues

- Shuffle et Repeat ne sont pas pilotables : Apple Music for Windows ne déclare pas ces commandes via SMTC (limitation de l'app elle-même, pas du plugin).
- Si le son passe par un logiciel de routage/mixage tiers (ex: SteelSeries Sonar) qui remixe l'audio en interne après Windows, le contrôle de volume agit sur la session Windows (la couche "source"), pas sur un éventuel fader interne à ce logiciel.

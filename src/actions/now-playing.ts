import {
	action,
	DialDownEvent,
	DialRotateEvent,
	SingletonAction,
	TouchTapEvent,
	WillAppearEvent,
	WillDisappearEvent
} from "@elgato/streamdeck";
import { nowPlayingService, NowPlayingPayload } from "../now-playing-service";
import { textWidthPx } from "../text-metrics";

type NowPlayingSettings = {
	filter?: string;
};

type FieldState = {
	text: string;
	pos: number;
	hold: number;
};

// Position interpolee entre deux polls du bridge (1.5s) pour un compteur fluide.
type Timeline = {
	baseMs: number;
	baseAt: number;
	durationMs: number;
	playing: boolean;
};

type DialState = {
	title: FieldState;
	artist: FieldState;
	paused: boolean;
	timeline: Timeline;
	shownElapsed: string;
};

const DEFAULT_FILTER = "Apple";
const SCROLL_INTERVAL_MS = 400;
const SCROLL_HOLD_TICKS = 5; // pause a chaque retour a 0 (5 * 400ms = 2s)
const RESYNC_THRESHOLD_MS = 1500; // ecart max poll/interpolation avant de resynchroniser
const CLICK_WINDOW_MS = 350; // 1 clic = pause/lecture, 2 = suivant, 3+ = precedent

// Defilement en pixels (rect du layout = 90px, marge de securite incluse) :
// les majuscules sont bien plus larges que les minuscules.
type ScrollSpec = { fontPx: number; semibold: boolean; maxPx: number; separator: string };
const TITLE_SPEC: ScrollSpec = { fontPx: 15, semibold: true, maxPx: 86, separator: " — " }; // tiret cadratin pour marquer la boucle
const ARTIST_SPEC: ScrollSpec = { fontPx: 12, semibold: false, maxPx: 86, separator: " " };

/**
 * Le champ "Artist" expose par Apple Music via SMTC contient parfois
 * "Artiste — Album" ou "Artiste1, Artiste2 — Titre - Single" en plus du nom.
 * On ne garde que la partie avant le tiret cadratin.
 */
function cleanArtist(raw: string | undefined): string {
	if (!raw) return "";
	return raw.split(/\s+—\s+/)[0].trim();
}

/** "Artiste1, Artiste2, Artiste3" -> "Artiste1 feat. Artiste2, Artiste3" */
function formatArtists(raw: string): string {
	const parts = raw
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length <= 1) {
		return raw;
	}
	return `${parts[0]} feat. ${parts.slice(1).join(", ")}`;
}

function formatTime(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const ss = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function positionOf(t: Timeline): number {
	const pos = t.playing ? t.baseMs + (Date.now() - t.baseAt) : t.baseMs;
	return Math.min(t.durationMs, Math.max(0, pos));
}

function timeFeedback(t: Timeline): { progress: number; elapsed: string; remaining: string } {
	if (t.durationMs <= 0) {
		return { progress: 0, elapsed: "", remaining: "" };
	}
	const pos = positionOf(t);
	return {
		progress: (pos / t.durationMs) * 100,
		elapsed: formatTime(pos),
		remaining: `-${formatTime(Math.ceil((t.durationMs - pos) / 1000) * 1000)}`
	};
}

function makeFieldState(text: string): FieldState {
	return { text, pos: 0, hold: SCROLL_HOLD_TICKS };
}

function fits(text: string, spec: ScrollSpec): boolean {
	return textWidthPx(text, spec.fontPx, spec.semibold) <= spec.maxPx;
}

/** Defilement circulaire : le texte boucle sur lui-meme (separe par `spec.separator`), la fenetre visible fait au plus `spec.maxPx` pixels. */
function scrollText(text: string, pos: number, spec: ScrollSpec): string {
	if (fits(text, spec)) {
		return text;
	}
	const cycle = text + spec.separator;
	let out = "";
	let width = 0;
	for (let i = 0; i < cycle.length; i++) {
		const ch = cycle[(pos + i) % cycle.length];
		const w = textWidthPx(ch, spec.fontPx, spec.semibold);
		if (width + w > spec.maxPx) {
			break;
		}
		out += ch;
		width += w;
	}
	return out;
}

/** Avance un FieldState d'un cran ; renvoie true si le texte affiche a change. */
function tickField(state: FieldState, spec: ScrollSpec): boolean {
	if (fits(state.text, spec)) {
		return false;
	}
	if (state.hold > 0) {
		state.hold -= 1;
		return false;
	}
	const cycle = state.text + spec.separator;
	const cycleLen = cycle.length;
	let next = state.pos + 1;
	if (next >= cycleLen) {
		next = 0;
	} else if (cycle[next] === " ") {
		// Une frame qui commence par une espace est tronquee au rendu Stream
		// Deck (donne l'impression d'un double palier) : on saute dessus.
		next += 1;
		if (next >= cycleLen) {
			next = 0;
		}
	}
	state.pos = next;
	if (state.pos === 0) {
		state.hold = SCROLL_HOLD_TICKS;
	}
	return true;
}

@action({ UUID: "com.alexismartin.applemusic-nowplaying.nowplaying" })
export class NowPlayingAction extends SingletonAction<NowPlayingSettings> {
	private scrollTimer: NodeJS.Timeout | null = null;
	private dialState = new Map<string, DialState>();
	private clickState = new Map<string, { count: number; timer: NodeJS.Timeout }>();
	private onUpdate = (data: NowPlayingPayload) => void this.render(data);

	override async onWillAppear(ev: WillAppearEvent<NowPlayingSettings>): Promise<void> {
		const filter = ev.payload.settings?.filter?.trim() || DEFAULT_FILTER;
		if ([...this.actions].length === 1) {
			nowPlayingService.on("update", this.onUpdate);
		}
		nowPlayingService.acquire(filter);
		this.ensureScrollTimer();
		void this.render(nowPlayingService.latest);
	}

	override onWillDisappear(ev: WillDisappearEvent<NowPlayingSettings>): void {
		this.dialState.delete(ev.action.id);
		const pendingClick = this.clickState.get(ev.action.id);
		if (pendingClick) {
			clearTimeout(pendingClick.timer);
			this.clickState.delete(ev.action.id);
		}
		nowPlayingService.release();
		if ([...this.actions].length === 0) {
			nowPlayingService.off("update", this.onUpdate);
			this.stopScrollTimer();
		}
	}

	override async onDialDown(ev: DialDownEvent<NowPlayingSettings>): Promise<void> {
		const id = ev.action.id;
		const pending = this.clickState.get(id);
		if (pending) {
			clearTimeout(pending.timer);
			pending.count += 1;
		}
		const state = pending ?? { count: 1, timer: null as unknown as NodeJS.Timeout };
		this.clickState.set(id, state);
		state.timer = setTimeout(() => {
			this.clickState.delete(id);
			if (state.count === 1) {
				nowPlayingService.control("Toggle");
			} else if (state.count === 2) {
				nowPlayingService.control("Next");
			} else {
				nowPlayingService.control("Previous");
			}
		}, CLICK_WINDOW_MS);
	}

	override async onTouchTap(): Promise<void> {
		nowPlayingService.control("Toggle");
	}

	override async onDialRotate(ev: DialRotateEvent<NowPlayingSettings>): Promise<void> {
		nowPlayingService.control(ev.payload.ticks > 0 ? "Next" : "Previous");
	}

	private async render(data: NowPlayingPayload): Promise<void> {
		for (const visibleAction of this.actions) {
			if (!visibleAction.isDial()) {
				continue;
			}

			if (!data.hasSession) {
				this.dialState.delete(visibleAction.id);
				await visibleAction.setFeedback({ title: "Apple Music", artist: "—", pauseIcon: { enabled: false }, progress: 0, elapsed: "", remaining: "" });
				continue;
			}

			const title = data.title?.trim() || "?";
			const artist = formatArtists(cleanArtist(data.artist));
			const paused = data.status === "Paused";
			const polled = Math.max(0, data.positionMs ?? 0);
			const duration = data.durationMs ?? 0;
			const previous = this.dialState.get(visibleAction.id);
			const trackChanged = !previous || previous.title.text !== title || previous.artist.text !== artist;

			// Garde l'interpolation en cours tant que le poll (arrondi a la seconde)
			// est coherent avec elle ; sinon (piste, pause/lecture, seek) on resynchronise.
			const prevTimeline = previous?.timeline;
			const keepTimeline =
				!trackChanged &&
				prevTimeline !== undefined &&
				prevTimeline.playing === !paused &&
				prevTimeline.durationMs === duration &&
				Math.abs(positionOf(prevTimeline) - polled) <= RESYNC_THRESHOLD_MS;
			const timeline: Timeline = keepTimeline
				? prevTimeline
				: { baseMs: polled, baseAt: Date.now(), durationMs: duration, playing: !paused };

			// Ne PAS repartir a la position 0 ici : le scroll est deja gere par
			// tickScroll() toutes les 400ms. Rappeler scrollText(title, 0) a
			// chaque poll (1.5s) l'ecrasait et faisait "sauter" le texte au debut.
			const state: DialState = trackChanged
				? { title: makeFieldState(title), artist: makeFieldState(artist), paused, timeline, shownElapsed: "" }
				: previous;
			state.paused = paused;
			state.timeline = timeline;
			this.dialState.set(visibleAction.id, state);

			const time = timeFeedback(timeline);
			state.shownElapsed = time.elapsed;

			await visibleAction.setFeedback({
				title: scrollText(state.title.text, state.title.pos, TITLE_SPEC),
				artist: scrollText(state.artist.text, state.artist.pos, ARTIST_SPEC) || "Apple Music",
				pauseIcon: { enabled: paused },
				...time,
				...(data.thumbnail && data.thumbMime ? { cover: `data:${data.thumbMime};base64,${data.thumbnail}` } : {})
			});
		}
	}

	private ensureScrollTimer(): void {
		if (this.scrollTimer) {
			return;
		}
		this.scrollTimer = setInterval(() => void this.tickScroll(), SCROLL_INTERVAL_MS);
	}

	private stopScrollTimer(): void {
		if (this.scrollTimer) {
			clearInterval(this.scrollTimer);
			this.scrollTimer = null;
		}
	}

	private async tickScroll(): Promise<void> {
		for (const visibleAction of this.actions) {
			if (!visibleAction.isDial()) {
				continue;
			}
			const state = this.dialState.get(visibleAction.id);
			if (!state || state.paused) {
				continue;
			}

			const titleChanged = tickField(state.title, TITLE_SPEC);
			const artistChanged = tickField(state.artist, ARTIST_SPEC);
			const time = timeFeedback(state.timeline);
			const timeChanged = time.elapsed !== state.shownElapsed;
			if (!titleChanged && !artistChanged && !timeChanged) {
				continue;
			}
			state.shownElapsed = time.elapsed;

			await visibleAction.setFeedback({
				...(timeChanged ? time : {}),
				...(titleChanged ? { title: scrollText(state.title.text, state.title.pos, TITLE_WINDOW, TITLE_SEPARATOR) } : {}),
				...(artistChanged
					? { artist: scrollText(state.artist.text, state.artist.pos, ARTIST_WINDOW, ARTIST_SEPARATOR) }
					: {})
			});
		}
	}
}

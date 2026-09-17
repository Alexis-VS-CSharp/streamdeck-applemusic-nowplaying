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

type NowPlayingSettings = {
	filter?: string;
};

type FieldState = {
	text: string;
	pos: number;
	hold: number;
};

type DialState = {
	title: FieldState;
	artist: FieldState;
	paused: boolean;
};

const DEFAULT_FILTER = "Apple";
const SCROLL_INTERVAL_MS = 400;
const SCROLL_HOLD_TICKS = 5; // pause a chaque retour a 0 (5 * 400ms = 2s)
const CLICK_WINDOW_MS = 350; // 1 clic = pause/lecture, 2 = suivant, 3+ = precedent

const TITLE_WINDOW = 13;
const TITLE_SEPARATOR = " — "; // tiret cadratin pour bien marquer la boucle du titre
const ARTIST_WINDOW = 16;
const ARTIST_SEPARATOR = " ";

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

function makeFieldState(text: string): FieldState {
	return { text, pos: 0, hold: SCROLL_HOLD_TICKS };
}

/** Defilement circulaire : le texte boucle sur lui-meme (separe par `separator`) jusqu'a revenir exactement au debut. */
function scrollText(text: string, pos: number, window: number, separator: string): string {
	if (text.length <= window) {
		return text;
	}
	const cycle = text + separator;
	const looped = cycle + cycle;
	return looped.slice(pos, pos + window);
}

/** Avance un FieldState d'un cran ; renvoie true si le texte affiche a change. */
function tickField(state: FieldState, window: number, separator: string): boolean {
	if (state.text.length <= window) {
		return false;
	}
	if (state.hold > 0) {
		state.hold -= 1;
		return false;
	}
	const cycle = state.text + separator;
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
				await visibleAction.setFeedback({ title: "Apple Music", artist: "—", pauseIcon: { enabled: false }, progress: 0 });
				continue;
			}

			const title = data.title?.trim() || "?";
			const artist = formatArtists(cleanArtist(data.artist));
			const paused = data.status === "Paused";
			const progress =
				data.durationMs && data.durationMs > 0
					? Math.min(100, Math.max(0, ((data.positionMs ?? 0) / data.durationMs) * 100))
					: 0;
			const previous = this.dialState.get(visibleAction.id);
			const trackChanged = !previous || previous.title.text !== title || previous.artist.text !== artist;

			if (trackChanged) {
				this.dialState.set(visibleAction.id, {
					title: makeFieldState(title),
					artist: makeFieldState(artist),
					paused
				});
			} else {
				previous!.paused = paused;
			}
			// Ne PAS repartir a la position 0 ici : le scroll est deja gere par
			// tickScroll() toutes les 400ms. Rappeler scrollText(title, 0) a
			// chaque poll (1.5s) l'ecrasait et faisait "sauter" le texte au debut.
			const state = this.dialState.get(visibleAction.id)!;

			await visibleAction.setFeedback({
				title: scrollText(state.title.text, state.title.pos, TITLE_WINDOW, TITLE_SEPARATOR),
				artist: scrollText(state.artist.text, state.artist.pos, ARTIST_WINDOW, ARTIST_SEPARATOR) || "Apple Music",
				pauseIcon: { enabled: paused },
				progress,
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

			const titleChanged = tickField(state.title, TITLE_WINDOW, TITLE_SEPARATOR);
			const artistChanged = tickField(state.artist, ARTIST_WINDOW, ARTIST_SEPARATOR);
			if (!titleChanged && !artistChanged) {
				continue;
			}

			await visibleAction.setFeedback({
				...(titleChanged ? { title: scrollText(state.title.text, state.title.pos, TITLE_WINDOW, TITLE_SEPARATOR) } : {}),
				...(artistChanged
					? { artist: scrollText(state.artist.text, state.artist.pos, ARTIST_WINDOW, ARTIST_SEPARATOR) }
					: {})
			});
		}
	}
}

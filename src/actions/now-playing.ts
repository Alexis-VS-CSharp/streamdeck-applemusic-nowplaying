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

type DialState = {
	title: string;
	artist: string;
	scrollPos: number;
	holdTicks: number;
};

const DEFAULT_FILTER = "Apple";
const SCROLL_INTERVAL_MS = 400;
const SCROLL_WINDOW = 13;
const SCROLL_SEPARATOR = " — ";
const SCROLL_HOLD_TICKS = 5; // pause a chaque retour a 0 (5 * 400ms = 2s)

/**
 * Le champ "Artist" expose par Apple Music via SMTC contient parfois
 * "Artiste — Album" ou "Artiste1, Artiste2 — Titre - Single" en plus du nom.
 * On ne garde que la partie avant le tiret cadratin.
 */
function cleanArtist(raw: string | undefined): string {
	if (!raw) return "";
	return raw.split(/\s+—\s+/)[0].trim();
}

@action({ UUID: "com.alexismartin.applemusic-nowplaying.nowplaying" })
export class NowPlayingAction extends SingletonAction<NowPlayingSettings> {
	private scrollTimer: NodeJS.Timeout | null = null;
	private dialState = new Map<string, DialState>();
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
		nowPlayingService.release();
		if ([...this.actions].length === 0) {
			nowPlayingService.off("update", this.onUpdate);
			this.stopScrollTimer();
		}
	}

	override async onDialDown(): Promise<void> {
		nowPlayingService.control("Toggle");
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
			const artist = cleanArtist(data.artist);
			const paused = data.status === "Paused";
			const progress =
				data.durationMs && data.durationMs > 0
					? Math.min(100, Math.max(0, ((data.positionMs ?? 0) / data.durationMs) * 100))
					: 0;
			const previous = this.dialState.get(visibleAction.id);
			const trackChanged = !previous || previous.title !== title || previous.artist !== artist;

			if (trackChanged) {
				this.dialState.set(visibleAction.id, { title, artist, scrollPos: 0, holdTicks: SCROLL_HOLD_TICKS });
			}
			// Ne PAS repartir a la position 0 ici : le scroll est deja gere par
			// tickScroll() toutes les 400ms. Rappeler scrollText(title, 0) a
			// chaque poll (1.5s) l'ecrasait et faisait "sauter" le texte au debut.
			const scrollPos = this.dialState.get(visibleAction.id)!.scrollPos;

			await visibleAction.setFeedback({
				title: this.scrollText(title, scrollPos),
				artist: artist || "Apple Music",
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
			if (!state || state.title.length <= SCROLL_WINDOW) {
				continue;
			}

			if (state.holdTicks > 0) {
				state.holdTicks -= 1;
				continue;
			}

			const cycleLen = state.title.length + SCROLL_SEPARATOR.length;
			state.scrollPos += 1;
			if (state.scrollPos >= cycleLen) {
				state.scrollPos = 0;
				state.holdTicks = SCROLL_HOLD_TICKS;
			}
			await visibleAction.setFeedback({ title: this.scrollText(state.title, state.scrollPos) });
		}
	}

	private scrollText(text: string, pos: number): string {
		if (text.length <= SCROLL_WINDOW) {
			return text;
		}
		// Defilement circulaire : le texte boucle sur lui-meme (separe par un
		// espace) au lieu d'etre tronque en fin de course, jusqu'a revenir
		// exactement au debut.
		const cycle = text + SCROLL_SEPARATOR;
		const looped = cycle + cycle;
		return looped.slice(pos, pos + SCROLL_WINDOW);
	}
}

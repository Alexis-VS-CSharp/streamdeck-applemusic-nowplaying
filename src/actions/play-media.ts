import { Action, action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, streamDeck, WillAppearEvent } from "@elgato/streamdeck";
import { spawn } from "node:child_process";
import * as path from "node:path";

const BRIDGE_PATH = path.join(__dirname, "..", "resources", "NowPlayingBridge.exe");

type PlayMediaSettings = {
	url?: string;
	coverDataUri?: string;
	coverForUrl?: string;
	coverVersion?: number;
};

// Incrementer quand la logique de recuperation de la pochette change, pour
// invalider automatiquement les pochettes deja mises en cache par les
// utilisateurs (sans qu'ils aient a retirer/remettre le lien).
const COVER_VERSION = 2;

async function fetchCover(url: string): Promise<string | undefined> {
	const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
	const html = await res.text();
	const imageUrl = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
	if (!imageUrl) return undefined;

	// og:image est une banniere 1200x630 (partage social) avec des bandes
	// blanches autour de la pochette. On remplace le dernier segment (le
	// spec de taille, dont le format varie : "wp-60.jpg", "SC.DN01-60.jpg?l=..."
	// etc.) par un crop carre du CDN mzstatic (meme convention que l'API
	// iTunes Search : "<hash>bb.jpg").
	const withoutQuery = imageUrl.split("?")[0];
	const lastSlash = withoutQuery.lastIndexOf("/");
	const squareUrl = withoutQuery.slice(0, lastSlash + 1) + "1200x1200bb.jpg";
	const imgRes = await fetch(squareUrl);
	const contentType = imgRes.headers.get("content-type") || "image/jpeg";
	const buffer = Buffer.from(await imgRes.arrayBuffer());
	return `data:${contentType};base64,${buffer.toString("base64")}`;
}

@action({ UUID: "com.alexismartin.applemusic-nowplaying.play-media" })
export class PlayMediaAction extends SingletonAction<PlayMediaSettings> {
	override async onWillAppear(ev: WillAppearEvent<PlayMediaSettings>): Promise<void> {
		await this.refresh(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PlayMediaSettings>): Promise<void> {
		await this.refresh(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<PlayMediaSettings>): Promise<void> {
		const url = ev.payload.settings.url?.trim();
		if (!url) return;
		const child = spawn(BRIDGE_PATH, ["-Action", "PlayMedia", "-Url", url], { windowsHide: true });
		child.on("error", (err) => streamDeck.logger.warn(`play-media: launch failed: ${err.message}`));
	}

	private async refresh(visibleAction: Action<PlayMediaSettings>, settings: PlayMediaSettings): Promise<void> {
		if (!visibleAction.isKey()) return;

		const url = settings.url?.trim();
		if (!url) {
			await visibleAction.setImage();
			return;
		}

		if (settings.coverForUrl === url && settings.coverDataUri && settings.coverVersion === COVER_VERSION) {
			await visibleAction.setImage(settings.coverDataUri);
			return;
		}

		try {
			const image = await fetchCover(url);
			await visibleAction.setSettings({ ...settings, coverDataUri: image, coverForUrl: url, coverVersion: COVER_VERSION });
			if (image) await visibleAction.setImage(image);
		} catch (err) {
			streamDeck.logger.warn(`play-media: cover lookup failed: ${(err as Error).message}`);
		}
	}
}

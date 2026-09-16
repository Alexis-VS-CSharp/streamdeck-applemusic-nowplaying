import {
	action,
	KeyDownEvent,
	SingletonAction,
	streamDeck,
	WillAppearEvent,
	WillDisappearEvent
} from "@elgato/streamdeck";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import * as path from "node:path";

type NowPlayingSettings = {
	filter?: string;
};

type NowPlayingPayload = {
	hasSession: boolean;
	appId?: string;
	title?: string;
	artist?: string;
	album?: string;
	status?: string;
	thumbnail?: string | null;
	thumbMime?: string | null;
	error?: string;
};

const SCRIPT_PATH = path.join(__dirname, "..", "resources", "now-playing.ps1");
const DEFAULT_FILTER = "Apple";
const POLL_INTERVAL_MS = 1500;

@action({ UUID: "com.alexismartin.applemusic-nowplaying.nowplaying" })
export class NowPlayingAction extends SingletonAction<NowPlayingSettings> {
	private watcher: ChildProcessWithoutNullStreams | null = null;
	private watcherFilter = DEFAULT_FILTER;

	override async onWillAppear(ev: WillAppearEvent<NowPlayingSettings>): Promise<void> {
		const filter = ev.payload.settings?.filter?.trim() || DEFAULT_FILTER;
		this.ensureWatcher(filter);
	}

	override onWillDisappear(_ev: WillDisappearEvent<NowPlayingSettings>): void {
		if ([...this.actions].length === 0) {
			this.stopWatcher();
		}
	}

	override async onKeyDown(ev: KeyDownEvent<NowPlayingSettings>): Promise<void> {
		const filter = ev.payload.settings?.filter?.trim() || DEFAULT_FILTER;
		this.runControl("Toggle", filter);
	}

	private ensureWatcher(filter: string): void {
		if (this.watcher && this.watcherFilter === filter) {
			return;
		}
		this.stopWatcher();
		this.watcherFilter = filter;

		streamDeck.logger.info(`Starting now-playing watcher (filter="${filter}")`);
		this.watcher = spawn(
			"powershell.exe",
			[
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				SCRIPT_PATH,
				"-Filter",
				filter,
				"-IntervalMs",
				String(POLL_INTERVAL_MS)
			],
			{ windowsHide: true }
		);

		const rl = createInterface({ input: this.watcher.stdout });
		rl.on("line", (line) => void this.handleLine(line));
		this.watcher.stderr.on("data", (chunk: Buffer) => {
			streamDeck.logger.warn(`now-playing.ps1: ${chunk.toString().trim()}`);
		});
		this.watcher.on("exit", (code) => {
			streamDeck.logger.info(`now-playing.ps1 exited (code=${code})`);
			this.watcher = null;
		});
	}

	private stopWatcher(): void {
		if (this.watcher) {
			this.watcher.kill();
			this.watcher = null;
		}
	}

	private runControl(controlAction: "Toggle" | "Next" | "Previous", filter: string): void {
		const child = spawn(
			"powershell.exe",
			[
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				SCRIPT_PATH,
				"-Filter",
				filter,
				"-Action",
				controlAction
			],
			{ windowsHide: true }
		);
		child.on("error", (err) => streamDeck.logger.warn(`control command failed: ${err.message}`));
	}

	private async handleLine(line: string): Promise<void> {
		const trimmed = line.trim();
		if (!trimmed) {
			return;
		}

		let data: NowPlayingPayload;
		try {
			data = JSON.parse(trimmed);
		} catch {
			return;
		}

		for (const visibleAction of this.actions) {
			if (!data.hasSession) {
				await visibleAction.setTitle("Apple Music");
				await visibleAction.setImage();
				continue;
			}

			const title = data.title?.trim() || "?";
			const artist = data.artist?.trim() || "";
			const paused = data.status === "Paused";
			const label = paused ? `${artist}\n${title}\n(pause)` : `${artist}\n${title}`;

			await visibleAction.setTitle(label);
			if (data.thumbnail && data.thumbMime) {
				await visibleAction.setImage(`data:${data.thumbMime};base64,${data.thumbnail}`);
			} else {
				await visibleAction.setImage();
			}
		}
	}
}

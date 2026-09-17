import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import * as path from "node:path";
import streamDeck from "@elgato/streamdeck";

export type NowPlayingPayload = {
	hasSession: boolean;
	appId?: string;
	title?: string;
	artist?: string;
	album?: string;
	status?: string;
	thumbnail?: string | null;
	thumbMime?: string | null;
	positionMs?: number;
	durationMs?: number;
	error?: string;
};

export type ControlAction = "Toggle" | "Next" | "Previous" | "VolumeUp" | "VolumeDown" | "VolumeMute";

const BRIDGE_PATH = path.join(__dirname, "..", "resources", "NowPlayingBridge.exe");
const DEFAULT_FILTER = "Apple";
const POLL_INTERVAL_MS = 1500;

/**
 * Un seul process NowPlayingBridge.exe partage entre toutes les actions
 * visibles du plugin (dial + boutons), pour eviter de multiplier les
 * requetes SMTC concurrentes.
 */
class NowPlayingService extends EventEmitter {
	private watcher: ChildProcessWithoutNullStreams | null = null;
	private filter = DEFAULT_FILTER;
	private refCount = 0;
	private _latest: NowPlayingPayload = { hasSession: false };

	get latest(): NowPlayingPayload {
		return this._latest;
	}

	acquire(filter: string = DEFAULT_FILTER): void {
		this.refCount += 1;
		if (this.watcher && this.filter === filter) {
			return;
		}
		this.filter = filter;
		this.stopWatcher();
		this.startWatcher(filter);
	}

	/** Lance le process de polling ; se relance seul s'il crashe (ex: exception COM/WinRT rare cote bridge) tant qu'une action l'utilise encore. */
	private startWatcher(filter: string): void {
		streamDeck.logger.info(`NowPlayingService: starting watcher (filter="${filter}")`);
		const proc = spawn(
			BRIDGE_PATH,
			["-Filter", filter, "-IntervalMs", String(POLL_INTERVAL_MS)],
			{ windowsHide: true }
		);
		this.watcher = proc;
		const rl = createInterface({ input: proc.stdout });
		rl.on("line", (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				this._latest = JSON.parse(trimmed) as NowPlayingPayload;
				this.emit("update", this._latest);
			} catch {
				/* ignore malformed line */
			}
		});
		proc.stderr.on("data", (chunk: Buffer) => {
			streamDeck.logger.warn(`NowPlayingBridge: ${chunk.toString().trim()}`);
		});
		// Comparaison par reference : si stopWatcher() ou un nouveau
		// startWatcher() ont deja remplace this.watcher, cette sortie est
		// attendue (kill volontaire) et ne doit pas relancer un doublon.
		proc.on("exit", (code) => {
			streamDeck.logger.info(`NowPlayingBridge exited (code=${code})`);
			if (this.watcher === proc) {
				this.watcher = null;
				if (this.refCount > 0) {
					setTimeout(() => this.startWatcher(filter), 500);
				}
			}
		});
	}

	release(): void {
		this.refCount = Math.max(0, this.refCount - 1);
		if (this.refCount === 0) {
			this.stopWatcher();
		}
	}

	control(action: ControlAction, filter: string = this.filter): void {
		const child = spawn(BRIDGE_PATH, ["-Filter", filter, "-Action", action], { windowsHide: true });
		child.on("error", (err) => streamDeck.logger.warn(`control command failed: ${err.message}`));
	}

	/** Comme control(), mais renvoie ce que le bridge a imprime sur stdout (ex: l'etat mute). */
	controlWithOutput(action: ControlAction, filter: string = this.filter): Promise<string> {
		return new Promise((resolve) => {
			const child = spawn(BRIDGE_PATH, ["-Filter", filter, "-Action", action], { windowsHide: true });
			let output = "";
			child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
			child.on("error", (err) => {
				streamDeck.logger.warn(`control command failed: ${err.message}`);
				resolve("");
			});
			child.on("exit", () => resolve(output.trim()));
		});
	}

	private stopWatcher(): void {
		if (this.watcher) {
			this.watcher.kill();
			this.watcher = null;
		}
	}
}

export const nowPlayingService = new NowPlayingService();

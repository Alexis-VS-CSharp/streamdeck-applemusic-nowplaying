import { action, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { nowPlayingService, NowPlayingPayload } from "../now-playing-service";

@action({ UUID: "com.alexismartin.applemusic-nowplaying.playpause" })
export class PlayPauseAction extends SingletonAction {
	private onUpdate = (data: NowPlayingPayload) => void this.render(data);

	override async onWillAppear(): Promise<void> {
		if ([...this.actions].length === 1) {
			nowPlayingService.on("update", this.onUpdate);
		}
		nowPlayingService.acquire();
		void this.render(nowPlayingService.latest);
	}

	override onWillDisappear(_ev: WillDisappearEvent): void {
		nowPlayingService.release();
		if ([...this.actions].length === 0) {
			nowPlayingService.off("update", this.onUpdate);
		}
	}

	override async onKeyDown(): Promise<void> {
		nowPlayingService.control("Toggle");
	}

	private async render(data: NowPlayingPayload): Promise<void> {
		const image =
			data.hasSession && data.status === "Paused"
				? "imgs/actions/control/play"
				: "imgs/actions/control/pause";
		for (const visibleAction of this.actions) {
			await visibleAction.setImage(image);
		}
	}
}

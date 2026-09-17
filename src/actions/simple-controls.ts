import { action, SingletonAction } from "@elgato/streamdeck";
import { ControlAction, nowPlayingService } from "../now-playing-service";

function simpleControl(uuid: string, controlAction: ControlAction) {
	@action({ UUID: uuid })
	class SimpleControlAction extends SingletonAction {
		override async onKeyDown(): Promise<void> {
			nowPlayingService.control(controlAction);
		}
	}
	return SimpleControlAction;
}

export const PreviousAction = simpleControl("com.alexismartin.applemusic-nowplaying.previous", "Previous");
export const NextAction = simpleControl("com.alexismartin.applemusic-nowplaying.next", "Next");
export const VolumeUpAction = simpleControl("com.alexismartin.applemusic-nowplaying.volume-up", "VolumeUp");
export const VolumeDownAction = simpleControl("com.alexismartin.applemusic-nowplaying.volume-down", "VolumeDown");

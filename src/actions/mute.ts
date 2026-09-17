import { action, SingletonAction } from "@elgato/streamdeck";
import { nowPlayingService } from "../now-playing-service";

/**
 * A la difference des autres boutons de controle, celui-ci change d'icone
 * pour refleter l'etat mute/pas mute juste apres l'appui (le pont renvoie
 * l'etat resultant sur stdout). On ne peut pas suivre l'etat en continu sans
 * rouvrir le flyout volume d'Apple Music en permanence, donc l'icone ne se
 * met a jour qu'au moment ou l'utilisateur appuie sur le bouton.
 */
@action({ UUID: "com.alexismartin.applemusic-nowplaying.mute" })
export class MuteAction extends SingletonAction {
	override async onKeyDown(): Promise<void> {
		const output = await nowPlayingService.controlWithOutput("VolumeMute");
		if (output !== "true" && output !== "false") {
			return;
		}
		const image = output === "true" ? "imgs/actions/control/mute" : "imgs/actions/control/unmute";
		for (const visibleAction of this.actions) {
			await visibleAction.setImage(image);
		}
	}
}

import streamDeck from "@elgato/streamdeck";
import { NowPlayingAction } from "./actions/now-playing";

streamDeck.actions.registerAction(new NowPlayingAction());
streamDeck.connect();

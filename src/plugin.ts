import streamDeck from "@elgato/streamdeck";
import { NowPlayingAction } from "./actions/now-playing";
import { PlayPauseAction } from "./actions/play-pause";
import { PlayMediaAction } from "./actions/play-media";
import { MuteAction } from "./actions/mute";
import { NextAction, PreviousAction, VolumeDownAction, VolumeUpAction } from "./actions/simple-controls";

streamDeck.actions.registerAction(new NowPlayingAction());
streamDeck.actions.registerAction(new PlayPauseAction());
streamDeck.actions.registerAction(new PreviousAction());
streamDeck.actions.registerAction(new NextAction());
streamDeck.actions.registerAction(new VolumeUpAction());
streamDeck.actions.registerAction(new VolumeDownAction());
streamDeck.actions.registerAction(new MuteAction());
streamDeck.actions.registerAction(new PlayMediaAction());
streamDeck.connect();

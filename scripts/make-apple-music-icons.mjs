// Rasterise le logo officiel Apple Music (fourni par l'utilisateur) en PNG
// aux tailles attendues par le manifest Stream Deck.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const svgPath =
	"am-icon-pack/Apple Music_Icon_2020/AppleMusic_Icon_Color/RGB/SVG/Large/Apple_Music_Icon_RGB_lg_073120.svg";
const svg = readFileSync(svgPath);
const base = "com.alexismartin.applemusic-nowplaying.sdPlugin";

function render(size, outPath) {
	const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
	writeFileSync(outPath, resvg.render().asPng());
	console.log("wrote", outPath);
}

render(28, `${base}/imgs/plugin/category-icon.png`);
render(56, `${base}/imgs/plugin/category-icon@2x.png`);
render(20, `${base}/imgs/actions/now-playing/icon.png`);
render(40, `${base}/imgs/actions/now-playing/icon@2x.png`);
render(72, `${base}/imgs/actions/now-playing/key.png`);
render(144, `${base}/imgs/actions/now-playing/key@2x.png`);

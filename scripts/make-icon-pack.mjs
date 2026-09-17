// Construit un Icon Pack Stream Deck (.sdIconPack) avec le logo officiel
// Apple Music, installable directement dans le dossier IconPacks de
// l'utilisateur (utilisable ensuite pour n'importe quel bouton/page/profil,
// pas seulement les actions de ce plugin).
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const packDir = "com.alexismartin.applemusic-logos.sdIconPack";
const iconsDir = `${packDir}/icons`;
const previewsDir = `${packDir}/previews`;
mkdirSync(iconsDir, { recursive: true });
mkdirSync(previewsDir, { recursive: true });

const svgBase = "am-icon-pack/Apple Music_Icon_2020";
const sources = {
	"apple-music-color": `${svgBase}/AppleMusic_Icon_Color/RGB/SVG/Large/Apple_Music_Icon_RGB_lg_073120.svg`,
	"apple-music-white": `${svgBase}/AppleMusic_Icon_BlackandWhite/SVG/Large/Apple_Music_Icon_wht_lg_072420.svg`,
	"apple-music-black": `${svgBase}/AppleMusic_Icon_BlackandWhite/SVG/Large/Apple_Music_Icon_blk_lg_072420.svg`
};

const icons = [];
for (const [id, svgPath] of Object.entries(sources)) {
	const svg = readFileSync(svgPath);
	const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 144 } });
	writeFileSync(`${iconsDir}/${id}.png`, resvg.render().asPng());
	console.log("wrote", `${iconsDir}/${id}.png`);
	icons.push({ path: `${id}.png`, name: id.replace(/-/g, " "), tags: ["apple music", "music", "logo"] });
}

writeFileSync(`${packDir}/icon.png`, readFileSync(`${iconsDir}/apple-music-color.png`));
// Tous les icon packs installes par defaut ont un dossier previews/ : sans
// lui, Stream Deck semble filtrer silencieusement le pack de son navigateur
// d'icones (aucune erreur, juste invisible).
writeFileSync(`${previewsDir}/preview_1.png`, readFileSync(`${iconsDir}/apple-music-color.png`));

writeFileSync(`${packDir}/icons.json`, JSON.stringify(icons, null, 2));

writeFileSync(
	`${packDir}/manifest.json`,
	JSON.stringify(
		{
			Author: "Apple Inc. (logo officiel)",
			Description: "Logo Apple Music (couleur, blanc, noir) pour boutons, dossiers et profils Stream Deck.",
			Name: "Apple Music",
			Version: "1.0",
			Icon: "icon.png"
		},
		null,
		2
	)
);

console.log("Pack pret :", packDir);

// Genere en PNG (sans dependance externe) les icones des boutons de
// controle et l'overlay pause. Le logo Apple Music (plugin + action list +
// aperçu du dial) vient uniquement de make-apple-music-icons.mjs — ce
// script ne doit plus jamais toucher a ces fichiers.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const typeBuf = Buffer.from(type, "ascii");
	const lenBuf = Buffer.alloc(4);
	lenBuf.writeUInt32BE(data.length, 0);
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0; // filter: none
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
	}
	const idat = deflateSync(raw, { level: 9 });

	return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function makeCanvas(size) {
	const rgba = Buffer.alloc(size * size * 4);
	return {
		size,
		rgba,
		set(x, y, r, g, b, a) {
			if (x < 0 || y < 0 || x >= size || y >= size) return;
			const i = (y * size + x) * 4;
			const srcA = a / 255;
			const dstA = rgba[i + 3] / 255;
			const outA = srcA + dstA * (1 - srcA);
			if (outA <= 0) return;
			rgba[i] = (r * srcA + rgba[i] * dstA * (1 - srcA)) / outA;
			rgba[i + 1] = (g * srcA + rgba[i + 1] * dstA * (1 - srcA)) / outA;
			rgba[i + 2] = (b * srcA + rgba[i + 2] * dstA * (1 - srcA)) / outA;
			rgba[i + 3] = outA * 255;
		},
		fillCircle(cx, cy, r, [cr, cg, cb, ca]) {
			const minX = Math.floor(cx - r - 1);
			const maxX = Math.ceil(cx + r + 1);
			const minY = Math.floor(cy - r - 1);
			const maxY = Math.ceil(cy + r + 1);
			for (let y = minY; y <= maxY; y++) {
				for (let x = minX; x <= maxX; x++) {
					const dx = x + 0.5 - cx;
					const dy = y + 0.5 - cy;
					const d = Math.sqrt(dx * dx + dy * dy) - r;
					if (d <= 0) this.set(x, y, cr, cg, cb, ca);
					else if (d < 1) this.set(x, y, cr, cg, cb, ca * (1 - d));
				}
			}
		},
		fillRoundedRect(x0, y0, x1, y1, radius, [cr, cg, cb, ca]) {
			for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
				for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
					const inX = x >= x0 + radius && x <= x1 - radius;
					const inY = y >= y0 + radius && y <= y1 - radius;
					let inside = false;
					if (inX || inY) {
						inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
					} else {
						const cx = x < x0 + radius ? x0 + radius : x1 - radius;
						const cy = y < y0 + radius ? y0 + radius : y1 - radius;
						inside = (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
					}
					if (inside) this.set(x, y, cr, cg, cb, ca);
				}
			}
		},
		// points: [[x,y], ...] en coordonnees normalisees [0,1] x [0,1]
		fillPolygon(points, [cr, cg, cb, ca]) {
			const pts = points.map(([x, y]) => [x * this.size, y * this.size]);
			const ys = pts.map((p) => p[1]);
			const minY = Math.max(0, Math.floor(Math.min(...ys)));
			const maxY = Math.min(this.size - 1, Math.ceil(Math.max(...ys)));
			for (let y = minY; y <= maxY; y++) {
				const yc = y + 0.5;
				const xs = [];
				for (let i = 0; i < pts.length; i++) {
					const [x1, y1] = pts[i];
					const [x2, y2] = pts[(i + 1) % pts.length];
					if (y1 === y2) continue;
					if (yc < Math.min(y1, y2) || yc >= Math.max(y1, y2)) continue;
					xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
				}
				xs.sort((a, b) => a - b);
				for (let i = 0; i + 1 < xs.length; i += 2) {
					for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) {
						this.set(x, y, cr, cg, cb, ca);
					}
				}
			}
		}
	};
}

const RED = [250, 35, 59, 255];
const WHITE = [255, 255, 255, 255];

function withBrandBackground(size, draw) {
	const c = makeCanvas(size);
	c.fillRoundedRect(0, 0, size, size, size * 0.19, RED);
	draw(c);
	return c;
}

function triangle(points) {
	return points;
}

function prevIcon(size) {
	return withBrandBackground(size, (c) => {
		c.fillRoundedRect(size * 0.16, size * 0.28, size * 0.23, size * 0.72, size * 0.02, WHITE);
		c.fillPolygon(
			triangle([
				[0.46, 0.28],
				[0.46, 0.72],
				[0.25, 0.5]
			]),
			WHITE
		);
		c.fillPolygon(
			triangle([
				[0.74, 0.28],
				[0.74, 0.72],
				[0.53, 0.5]
			]),
			WHITE
		);
	});
}

function nextIcon(size) {
	return withBrandBackground(size, (c) => {
		c.fillRoundedRect(size * 0.77, size * 0.28, size * 0.84, size * 0.72, size * 0.02, WHITE);
		c.fillPolygon(
			triangle([
				[0.54, 0.28],
				[0.54, 0.72],
				[0.75, 0.5]
			]),
			WHITE
		);
		c.fillPolygon(
			triangle([
				[0.26, 0.28],
				[0.26, 0.72],
				[0.47, 0.5]
			]),
			WHITE
		);
	});
}

function playIcon(size) {
	return withBrandBackground(size, (c) => {
		c.fillPolygon(
			triangle([
				[0.36, 0.24],
				[0.36, 0.76],
				[0.72, 0.5]
			]),
			WHITE
		);
	});
}

function pauseButtonIcon(size) {
	return withBrandBackground(size, (c) => {
		c.fillRoundedRect(size * 0.34, size * 0.24, size * 0.45, size * 0.76, size * 0.02, WHITE);
		c.fillRoundedRect(size * 0.55, size * 0.24, size * 0.66, size * 0.76, size * 0.02, WHITE);
	});
}

function volumeUpIcon(size) {
	return withBrandBackground(size, (c) => {
		c.fillRoundedRect(size * 0.3, size * 0.46, size * 0.7, size * 0.54, size * 0.02, WHITE);
		c.fillRoundedRect(size * 0.46, size * 0.3, size * 0.54, size * 0.7, size * 0.02, WHITE);
	});
}

function volumeDownIcon(size) {
	return withBrandBackground(size, (c) => {
		c.fillRoundedRect(size * 0.3, size * 0.46, size * 0.7, size * 0.54, size * 0.02, WHITE);
	});
}

function drawSpeaker(c) {
	c.fillPolygon(
		triangle([
			[0.2, 0.42],
			[0.32, 0.42],
			[0.48, 0.28],
			[0.48, 0.72],
			[0.32, 0.58],
			[0.2, 0.58]
		]),
		WHITE
	);
}

function muteIcon(size) {
	return withBrandBackground(size, (c) => {
		drawSpeaker(c);
		// barre diagonale (mute)
		c.fillPolygon(
			triangle([
				[0.775, 0.275],
				[0.725, 0.225],
				[0.225, 0.725],
				[0.275, 0.775]
			]),
			WHITE
		);
	});
}

function unmuteIcon(size) {
	return withBrandBackground(size, (c) => {
		drawSpeaker(c);
		// deux petits arcs "son" (approximes par de fins quadrilateres courbes)
		c.fillPolygon(
			triangle([
				[0.56, 0.36],
				[0.6, 0.36],
				[0.66, 0.5],
				[0.6, 0.64],
				[0.56, 0.64],
				[0.62, 0.5]
			]),
			WHITE
		);
		c.fillPolygon(
			triangle([
				[0.68, 0.26],
				[0.72, 0.26],
				[0.8, 0.5],
				[0.72, 0.74],
				[0.68, 0.74],
				[0.76, 0.5]
			]),
			WHITE
		);
	});
}

function pauseOverlay(size) {
	const c = makeCanvas(size);
	c.fillCircle(size / 2, size / 2, size * 0.42, [0, 0, 0, 170]);
	const barW = size * 0.09;
	const barH = size * 0.32;
	const gap = size * 0.08;
	c.fillRoundedRect(size / 2 - gap / 2 - barW, size / 2 - barH / 2, size / 2 - gap / 2, size / 2 + barH / 2, barW * 0.25, WHITE);
	c.fillRoundedRect(size / 2 + gap / 2, size / 2 - barH / 2, size / 2 + gap / 2 + barW, size / 2 + barH / 2, barW * 0.25, WHITE);
	return c;
}

function save(path, canvas) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, encodePng(canvas.size, canvas.size, canvas.rgba));
	console.log("wrote", path);
}

const base = "com.alexismartin.applemusic-nowplaying.sdPlugin";
const control = `${base}/imgs/actions/control`;

save(`${base}/imgs/actions/now-playing/pause-overlay.png`, pauseOverlay(100));

for (const [name, fn] of Object.entries({
	prev: prevIcon,
	next: nextIcon,
	play: playIcon,
	pause: pauseButtonIcon,
	"volume-up": volumeUpIcon,
	"volume-down": volumeDownIcon,
	mute: muteIcon,
	unmute: unmuteIcon
})) {
	save(`${control}/${name}.png`, fn(72));
	save(`${control}/${name}@2x.png`, fn(144));
}

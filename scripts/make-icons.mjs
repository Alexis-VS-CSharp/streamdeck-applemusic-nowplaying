// Genere de petites icones PNG (placeholder) sans dependance externe,
// pour satisfaire le validateur Stream Deck qui exige des fichiers .png.
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
			// alpha-blend over existing pixel
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
					if (d <= 0) {
						this.set(x, y, cr, cg, cb, ca);
					} else if (d < 1) {
						this.set(x, y, cr, cg, cb, ca * (1 - d));
					}
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
		fillRotatedRect(cx, cy, w, h, angleRad, color) {
			const cos = Math.cos(angleRad);
			const sin = Math.sin(angleRad);
			const half = Math.max(w, h) * 0.75;
			for (let y = Math.floor(cy - half); y <= Math.ceil(cy + half); y++) {
				for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
					const dx = x + 0.5 - cx;
					const dy = y + 0.5 - cy;
					const lx = dx * cos + dy * sin;
					const ly = -dx * sin + dy * cos;
					if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) {
						this.set(x, y, ...color);
					}
				}
			}
		}
	};
}

const RED = [250, 35, 59, 255];
const WHITE = [255, 255, 255, 255];
const DARK = [30, 30, 30, 255];

function drawNote(canvas, cx, cy, scale) {
	const headR = 5.4 * scale;
	const dx = 7.2 * scale;
	const dy = 5.6 * scale;
	const x1 = cx - dx;
	const y1 = cy + dy * 0.55;
	const x2 = cx + dx;
	const y2 = cy - dy * 0.75;

	const angle = Math.atan2(y2 - y1, x2 - x1);
	canvas.fillRotatedRect((x1 + x2) / 2, (y1 + y2) / 2 - headR * 0.15, Math.hypot(x2 - x1, y2 - y1) + headR, headR * 0.65, angle, WHITE);
	canvas.fillCircle(x1, y1, headR, WHITE);
	canvas.fillCircle(x2, y2, headR, WHITE);
	canvas.fillCircle(x1, y1, headR * 0.42, RED.map((v, i) => (i === 3 ? 255 : v)));
	canvas.fillCircle(x2, y2, headR * 0.42, RED.map((v, i) => (i === 3 ? 255 : v)));
}

function categoryOrActionIcon(size) {
	const c = makeCanvas(size);
	const r = size * 0.46;
	c.fillCircle(size / 2, size / 2, r, RED);
	drawNote(c, size / 2, size / 2, size / 28);
	return c;
}

function keyIcon(size) {
	const c = makeCanvas(size);
	c.fillRoundedRect(0, 0, size, size, size * 0.19, DARK);
	const r = size * 0.235;
	c.fillCircle(size / 2, size * 0.42, r, RED);
	drawNote(c, size / 2, size * 0.42, size / 72);
	return c;
}

function save(path, canvas) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, encodePng(canvas.size, canvas.size, canvas.rgba));
	console.log("wrote", path);
}

const base = "com.alexismartin.applemusic-nowplaying.sdPlugin";

save(`${base}/imgs/plugin/category-icon.png`, categoryOrActionIcon(28));
save(`${base}/imgs/plugin/category-icon@2x.png`, categoryOrActionIcon(56));
save(`${base}/imgs/actions/now-playing/icon.png`, categoryOrActionIcon(20));
save(`${base}/imgs/actions/now-playing/icon@2x.png`, categoryOrActionIcon(40));
save(`${base}/imgs/actions/now-playing/key.png`, keyIcon(72));
save(`${base}/imgs/actions/now-playing/key@2x.png`, keyIcon(144));

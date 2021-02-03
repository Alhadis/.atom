"use strict";

const fs       = require("fs");
const path     = require("path");
const {$}      = require("./other.js");
const isByte   = x => `${parseInt(x, 10)}` === `${x}` && x >= 0x00 && x <= 0xFF;
const isNybble = x => isByte(x) && x <= 0x7F;

/**
 * Load the first 255 lines of UnicodeData.txt, assuming ~/Labs/Unitome exists.
 * @return {Promise<string[]>}
 * @main
 */
async function loadUnicodeData(path, size = BUFFER_SIZE){
	if(fs.existsSync(path)){
		const fd = fs.openSync(path, "r");
		const buffer = Buffer.alloc(size);
		const bytesRead = fs.readSync(fd, buffer, 0, buffer.length);
		fs.closeSync(fd);
		return buffer
			.asciiSlice(0, Math.min(bytesRead, size))
			.split(/\r?\n|\r/)
			.slice(0, 255);
	}
	else return [];
}


/**
 * @const {Number} BUFFER_SIZE
 * @desc Number of bytes to read from `UnicodeData.txt` that covers the first
 * 255 records (inclusive), with enough wiggle-room to accommodate unexpected
 * CRLF endings (and then some).
 *
 * NOTE: The Unicode spec assures us that future revisions of the standard will
 * never modify existing records in `UnicodeData.txt`, hence the hardcoded value.
 *
 * @see {@link https://unicode.org/reports/tr44/|UAX #44}
 * @internal
 */
const BUFFER_SIZE = 15970;


/**
 * @const {String} DB_PATH
 * @desc Path to UnicodeData.txt, which is assumed to be
 *       located at `~/Labs/Unitome/ucd/UnicodeData.txt`.
 * @see {@link https://github.com/Alhadis/Unitome}
 * @internal
 */
const DB_PATH = path.resolve(atom.getConfigDirPath(), "../Labs/Unitome/ucd/UnicodeData.txt");



class ASCIITable extends Array{
	constructor(defs = []){
		super(...defs);
		return new Proxy(this, {
			get(target, key){
				return isByte(key)
					? target.lookupInfo(key)
					: Reflect.get(...arguments);
			},
			set(target, key, value){
				if(isByte(key)) return;
				Reflect.set(...arguments);
			},
		});
	}
}

module.exports = loadUnicodeData(DB_PATH).then(defs =>
	global.ASCII = new ASCIITable(defs));

Object.assign(module.exports, {
	BUFFER_SIZE,
	DB_PATH,
	ASCIITable,
	isByte,
	isNybble,
});
Object.freeze(module.exports);

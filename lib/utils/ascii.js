"use strict";

const fs         = require("fs");
const {resolve}  = require("path");
const {homedir}  = require("os");
const {RecordJar = window.RecordJar} = require("record-jar"); // Seriously, John?

const defSrc        = resolve(homedir(), "Labs/Unitome/ucd/UnicodeData.txt");
const nameTableURL  = new URL("https://gitlab.com/esr/ascii/-/raw/master/nametable");
const nameTableFile = resolve(atom.configDirPath, "dev/ascii/nametable");
const nameTable     = fs.existsSync(nameTableFile)
	? fs.readFileSync(nameTableFile, "utf8")
	: fetch(nameTableURL).then(res => res.text());

module.exports = Promise.all([
	
	// Load the latest name-table from ascii(1)'s upstream repository
	Promise.resolve(nameTable).then(async tbl => {
		const jar = new RecordJar(tbl);
		
		// Sanitise each field-name so we have something resembling a JS object
		const records = [];
		for(const originalRecord of jar.records){
			const record = {__proto__: null};
			
			// Interpret the field-names ESR actually didn't intend to have interpreted
			const fields = Object.entries(originalRecord);
			for(let [key, value] of fields){
				key = key.trim()
					.toLowerCase()
					.replace(/^(comment|iso name|mnemonic|synonym)s$/i, "$1")
					.replace(/[_\s]+/g, "-")
					.replace(/(\w)[-](\w)/g, (_, a, b) => a + b.toUpperCase());
				
				value = JSON.parse(`[${value.replace(/\s*,?\s*$/, "")}]`);
				if(value.length < 2)
					[value = ""] = value;
				
				if(key in record)
					(record[key] = Array.isArray(record[key])
						?  record[key]
						: [record[key]]
					).push(value);
				else record[key] = value;
			}
			
			// Final pass
			for(let [key, value] of Object.entries(record)){
				if(Array.isArray(value) && value.length < 2)
					[value = ""] = value;
				if("comment" === key){
					if(Array.isArray(value) && value.every(x => x.startsWith("# ")))
						value = value.map(x => x.replace(/^#\s+/, "")).join("\n");
					if("string" === typeof value)
						value = value.replace(/^#\s+/, "").trim();
				}
				record[key] = value;
			}
			records.push(record);
		}
		jar.records = records;
		return jar;
	}),
	
	// Load the first 255 lines of UnicodeData.txt
	new Promise((resolve, reject) => {
		if(!fs.existsSync(defSrc))
			return reject(new ReferenceError(`No such file: ${defSrc}`));
		
		const buffer    = Buffer.alloc(15970);
		const fd        = fs.openSync(defSrc, "r");
		const bytesRead = fs.readSync(fd, buffer, 0, buffer.length);
		fs.closeSync(fd);
		resolve(buffer
			.asciiSlice(0, Math.min(bytesRead, buffer.length))
			.split(/\r?\n|\r/)
			.slice(0, 255)
			.map(line => {
				line = line.split(";");
				return {
					codePoint:          parseInt(line[0], 16),
					name:               line[1],
					generalCategory:    line[2],
					combiningClass:     line[3],
					bidiCategory:       line[4],
					decomposition:      line[5],
					decimalDigitValue: +line[6],
					digitValue:        +line[7],
					numericValue:      +line[8],
					mirrored:   "Y" === line[9].toUpperCase(),
					unicode1Name:       line[10],
					iso10646Comment:    line[11],
					upperCaseMapping:   line[12],
					lowerCaseMapping:   line[13],
					titleCaseMapping:   line[14],
				};
			}));
	}),
]).then(([names, defs]) => {
	const {length} = names.records;
	for(let i = 0; i < length; ++i)
		Object.assign(defs[i], names.records[i]);
	
	// Latin-1 supplement
	const latin1 = [
		["PAD",  "Padding Character"],
		["HOP",  "High Octet Preset"],
		["BPH",  "Break Permitted Here"],
		["NBH",  "No Break Here"],
		["IND",  "Index"],
		["NEL",  "Next Line"],
		["SSA",  "Start of Selected Area"],
		["ESA",  "End of Selected Area"],
		["HTS",  "Character (Horizontal) Tabulation Set"],
		["HTJ",  "Character (Horizontal) Tabulation with Justification"],
		["LTS",  "Line (Vertical) Tabulation Set"],
		["PLD",  "Partial Line Forward (Down)"],
		["PLU",  "Partial Line Backward (Up)"],
		["RI",   "Reverse Line Feed (Index)"],
		["SS2",  "Single-Shift Two"],
		["SS3",  "Single-Shift Three"],
		["DCS",  "Device Control String"],
		["PU1",  "Private Use One"],
		["PU2",  "Private Use Two"],
		["STS",  "Set Transmit State"],
		["CCH",  "Cancel character"],
		["MW",   "Message Waiting"],
		["SPA",  "Start of Protected Area"],
		["EPA",  "End of Protected Area"],
		["SOS",  "Start of String"],
		["SGCI", "Single Graphic Character Introducer"],
		["SCI",  "Single Character Introducer"],
		["CSI",  "Control Sequence Introducer"],
		["ST",   "String Terminator"],
		["OSC",  "Operating System Command"],
		["PM",   "Private Message"],
		["APC",  "Application Program Command"],
	];
	for(let i = 0x80; i < 0x9F; ++i){
		const [mnemonic, name] = latin1[i - 0x80];
		Object.assign(defs[i], {mnemonic, name});
	}
	return global.ASCII = defs;
});

"use strict";

const {readFileSync} = require("fs");

class CharInfo{
	static db = {__proto__: null};
	static #loaded = false;
	
	static loadDB(fromPath){
		if(this.#loaded) return;
		readFileSync(fromPath, "utf8").trim().split("\n").map(CharInfo.fromString.bind(this));
		this.#loaded = true;
	}
	
	static fromString(input){
		return new this(...input.trim().split(";"));
	}
	
	constructor(...args){
		const code = parseInt(args[0], 16);
		if(code in CharInfo.db)
			return CharInfo[code];
		CharInfo.db[code] = this;
		
		this.codePoint          =  code;
		this.name               =  args[1];
		this.generalCategory    =  args[2];
		this.combiningClass     =  args[3];
		this.bidiCategory       =  args[4];
		this.decomposition      =  args[5];
		this.decimalDigitValue  = +args[6];
		this.digitValue         = +args[7];
		this.numericValue       = +args[8];
		this.mirrored           =  args[9].toUpperCase() === "Y";
		this.unicode1Name       =  args[10];
		this.iso10646Comment    =  args[11];
		this.upperCaseMapping   =  args[12];
		this.lowerCaseMapping   =  args[13];
		this.titleCaseMapping   =  args[14];
		
		// Resolve the most human-readable/meaningful name for this glyph
		this.readableName = ("<control>" === this.name
			? code in global.ASCII && "<control>" !== global.ASCII[code].name
				? global.ASCII[code].name.toUpperCase()
				: this.unicode1Name
			: null) || this.name;
	}
}

Object.defineProperty(CharInfo, "db", {writable: false, configurable: false});
module.exports = CharInfo;

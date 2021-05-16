"use strict";

const {readFileSync, writeFileSync} = require("fs");
const {Asar, loadGrammar} = require("../utils/loaders.js");
const {OnigRegExp} = loadFromCore("oniguruma");
const Grammar = loadFromCore("first-mate/lib/grammar");

Object.assign(Grammar.prototype, {
	load(){
		if(this.source)
			return this.source;
		if(this.source = loadGrammar(this.path, true)){
			const {
				foldingStartMarker: start,
				foldingStopMarker:  stop,
			} = this.source || {};
			if(start) this.foldingStartMarker = new OnigRegExp(start);
			if(stop)  this.foldingStopMarker  = new OnigRegExp(stop);
			return this.source;
		}
	},
	edit(){
		let {path} = this;
		const isJSON = path.endsWith(".json");
		const info = Asar.splitPath(path);
		if(info.isAsar){
			const asar = Asar.createArchive(info.asarPath);
			path = asar.copyFileOut(info.filePath);
			if(isJSON){
				const data = JSON.parse(readFileSync(path, "utf8"));
				writeFileSync(path, JSON.stringify(data, null, "\t"), "utf8");
			}
		}
		return atom.workspace.open(path).then(ed => {
			if(isJSON) ed.grammar = "source.json";
		});
	},
});

const {getGrammars} = atom.grammars;

// Remind grammar-selector I don't give a fuck about tree-shitter
atom.grammars.getGrammars = function(params){
	const includeTreeSitter = document.body.classList.contains("shitting-trees");
	return getGrammars.call(this, {...params, includeTreeSitter});
};
atom.config.observe("core.useTreeSitterParsers", value => {
	document.body.classList.toggle("shitting-trees", value);
	atom.config.set("grammar-selector.hideDuplicateTextMateGrammars", !value);
});

for(const grammar of atom.grammars.getGrammars())
	grammar.bundledPackage || grammar.path && grammar.load();

"use strict";

const {readFileSync, writeFileSync} = require("fs");
const Grammar = loadFromCore("first-mate/lib/grammar");
const Plist   = loadFromCore("plist");
const Asar    = process._linkedBinding("atom_common_asar");
const V8Util  = process._linkedBinding("atom_common_v8_util");

Object.defineProperties(Grammar.prototype, {
	edit: {
		value(){
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
	},
});

// Support grammar formats that aren't CSON or JSON
const {getGrammars, readGrammar, readGrammarSync} = atom.grammars;
for(const method of ["readGrammar", "readGrammarSync"])
	atom.grammars[method] = function(...args){
		const [path] = args;
		const src = readFileSync(path, "utf8");
		
		// XML property list
		if(/\.(tmLanguage|plist)$/i.test(path))
			return loadPlist(src);
		
		// YAML
		if(/\.(ya?ml-tmlanguage|syntax)$/i.test(path))
			return YAML.loadAll(readFileSync(path, "utf8"))[0];
		
		// CSON and JSON
		return (method.endsWith("Sync")
			? readGrammarSync
			: readGrammar
		).apply(this, args);
	};

// Remind grammar-selector I don't give a fuck about tree-shitter
atom.grammars.getGrammars = function(params){
	const includeTreeSitter = document.body.classList.contains("shitting-trees");
	return getGrammars.call(this, {...params, includeTreeSitter});
};
atom.config.observe("core.useTreeSitterParsers", value => {
	document.body.classList.toggle("shitting-trees", value);
	atom.config.set("grammar-selector.hideDuplicateTextMateGrammars", !value);
});

"use strict";

const {extname} = require("path");
const {existsSync, statSync, readdirSync, readFileSync, writeFileSync} = require("fs");
const {Asar, loadGrammar} = require("../utils/loaders.js");
const {asciify, findGrammar} = require("../utils/other.js");
const {OnigRegExp} = loadFromCore("oniguruma");
const Grammar = loadFromCore("first-mate/lib/grammar");
const Pattern = loadFromCore("first-mate/lib/pattern");
const Scanner = loadFromCore("first-mate/lib/scanner");

const {TextEditor} = require("atom");
const editor = new TextEditor();
editor.setGrammar(atom.grammars.nullGrammar);
editor.setText("*");
const line = editor.tokenizedBuffer.buildTokenizedLineForRow(0);
const Token = line.tokens[0].constructor;
const TokenizedLine = line.constructor;
const TokenIterator = editor.languageMode.tokenIterator.constructor;
editor.destroy();

TokenizedLine.prototype.retrace = function(){
	const iterator = this.getTokenIterator();
	iterator.capture(true);
	const {tokens} = this;
	iterator.capture(false);
	const {history} = iterator;
	delete iterator.history;
	return {history, tokens};
};

const {reset} = TokenIterator.prototype;
const iterators = new Map();
Object.assign(TokenIterator.prototype, {
	isCapturing: false,
	capture(enable = true){
		// Stop capturing
		if(!enable)
			return void (iterators.has(this) && iterators.get(this)());
		
		// Start capturing
		if(iterators.has(this)) return;
		this.isCapturing = true;
		this.text = "";
		
		const lists = new Set();
		iterators.set(this, () => {
			delete this.reset;
			this.isCapturing = false;
			for(const list of lists)
				delete list.push, list.pop;
			lists.clear();
			iterators.delete(this);
		});
		this.reset = function(...args){
			const context = this;
			const result = reset.apply(this, args);
			this.history = [];
			for(const list of ["scopeStarts", "scopeEnds"])
			for(const action of ["push", "pop"])
				lists.add(Object.defineProperty(this[list], action, {
					enumerable: false,
					configurable: true,
					value(...args){
						const result = Array.prototype[action].apply(this, args);
						const state = {
							tagIndex:    context.index,
							startColumn: context.startColumn,
							endColumn:   context.endColumn,
							text:        context.getText(),
						};
						context.history.push({list, action, args, state});
						return result;
					},
				}));
			return result;
		};
	},
});


Object.assign(Grammar.prototype, {
	load(){
		if(this.source)
			return this.source;
		if(this.source = loadGrammar(this.path, null, true)){
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

const upcase = /^([\W\d]*)(\w[-\w]*)|\b((?!(?:else|from|over|then|when)\b)\w[-\w]{3,}|\w[-\w]*[\W\d]*$)/gu;
const xform  = /\${(\d+):((?:\/(?:upcase|downcase|capitalize|titlecase|asciify|scopify))+)}/g;
const {resolveScopeName} = Pattern.prototype;
Pattern.prototype.resolveScopeName = function(scopeName, line, captureIndices){
	return resolveScopeName.call(this, scopeName, line, captureIndices)
		.replace(xform, (match, index, cmds) => {
			let capture = captureIndices[+index];
			if(null == capture)
				return match;
			capture = String(line).slice(capture.start, capture.end);
			for(const cmd of cmds.split("/")) switch(cmd){
				case "capitalize":
				case "titlecase":
					capture = capture.toLowerCase().replace(upcase, ($0, $1, $2) => $1
						? $1 + $2[0].toUpperCase() + $2.slice(1).toLowerCase()
						:      $0[0].toUpperCase() + $0.slice(1).toLowerCase());
					break;
				case "scopify":  capture = (findGrammar(capture) || {}).scopeName || ""; break;
				case "asciify":  capture = asciify(capture);      break;
				case "upcase":   capture = capture.toUpperCase(); break;
				case "downcase": capture = capture.toLowerCase(); break;
			}
			return capture;
		}).replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "");
};

const {createScanner} = Scanner.prototype;
Scanner.prototype.createScanner = function(firstLine, position, anchorPosition){
	try{ return createScanner.call(this, firstLine, position, anchorPosition); }
	catch(error){
		const args = {firstLine, position, anchorPosition};
		console.error({context: this, error, args});
		throw error;
	}
};

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


const foreigners = new WeakMap();
const isFile = path => existsSync(path) && statSync(path).isFile()      ? path : null;
const isDir  = path => existsSync(path) && statSync(path).isDirectory() ? path : null;
const lsDir  = dir  => readdirSync(dir).map(name => `${dir}/${name}`);

function isForeignGrammarFile(path){
	if(!isFile(path = String(path))) return;
	const ext = extname(path).toLowerCase();
	switch(ext){
		case ".tmlanguage":
		case ".plist":
		case ".yaml-tmlanguage":
		case ".yml-tmlanguage":
		case ".syntax":
			return true;
		default:
			return false;
	}
}

function loadForeignGrammars(pkg){
	if(foreigners.has(pkg))
		return foreigners.get(pkg);
	const grammars = [];
	const dir = (
		isDir(pkg.path + "/grammars") ||
		isDir(pkg.path + "/Syntaxes") ||
		lsDir(pkg.path).some(isForeignGrammarFile) && pkg.path
	);
	if(dir) for(const entry of lsDir(dir)){
		if(isForeignGrammarFile(entry))
			grammars.push(loadGrammar(entry, pkg));
	}
	foreigners.set(pkg, grammars);
}

module.exports = {
	Grammar,
	Pattern,
	Scanner,
	OnigRegExp,
	foreigners,
	isForeignGrammarFile,
	loadForeignGrammars,
	Token,
	TokenizedLine,
	TokenIterator,
};

new Promise(resolve => {
	if(atom.packages.hasActivatedInitialPackages)
		return resolve();
	const x = atom.packages.onDidActivateInitialPackages(() =>
		resolve(x.dispose()));
}).then(() => setTimeout(() => {
	const fn = pkg => {
		const name = (pkg.name || "").toLowerCase();
		if("language-not-mine" === pkg.name || name.endsWith(".tmbundle"))
			loadForeignGrammars(pkg);
	};
	atom.packages.getActivePackages().forEach(fn);
	atom.packages.onDidActivatePackage(fn);
}, 500));

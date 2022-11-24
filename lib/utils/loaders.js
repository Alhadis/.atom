/**
 * @fileoverview Helpers for conservatively loading resources during runtime.
 * Intended to help interactive debugging/experimentation in the dev-console.
 */
"use strict";

const {join, resolve, dirname} = require("path");
const {openSync, readSync, readFileSync, closeSync} = require("fs");
const home = require("os").homedir();
const labs = join(home, "Labs");
const Asar = process._linkedBinding("electron_common_asar");
const CoffeeScript = loadFromCore("coffee-script");
const CSON = loadFromCore("season");
const YAML = loadFromCore("js-yaml");
const Plist = loadFromCore("plist");

module.exports = {
	buildRegExp,
	inced,
	loadFromCore,
	loadGrammar,
	loadPlist,
	transpileESM,
	wrapModule,
	Asar,
	YAML,
	Plist,
};

delete (Object.assign(inced, module.exports)).inced;
Object.defineProperty(inced, "cache", {enumerable: true, value: {
	__proto__: null,
	files:   {__proto__: null},
	unsaved: {__proto__: null},
}});


/**
 * "Compile" expanded regular expression source into a new RegExp object.
 * @param {String} source
 * @param {Object} [variables={}]
 * @return {RegExp}
 */
function buildRegExp(source, variables = {}){
	let match = null;
	let flags = "";

	// Strip surrounding delimiters from beginning and end of file
	if("/" === source[0] && (match = source.match(/\/([a-z]*)\s*$/))){
		flags = match[1];
		source = source.substring(1, match.index);
	}
	
	// Strip scoped modifiers from the start of the file
	if(match = source.match(/^\s*\(\?([a-z]+(?:-[a-z]*)?|-[a-z]+)\)/)){
		source = source.substring(match[0].length);
		const [add, remove = ""] = match[1].split("-");
		flags = new Set((flags + add).replace(/[^gimsuy]/g, ""));
		[...remove].forEach(x => flags.delete(x));
		flags = [...flags].join("");
	}
	
	// Shim some missing features
	source = source
		.replace(/\\R/g, "(?:\\r\\n|\\n|\\r)")
		.replace(/\\a/g, "\\x07")
		.replace(/\\e/g, "\\x1B");
	
	// Strip comments and whitespace
	source = source.replace(/\(\?#[^)]*\)/g, "").replace(/\s+/g, "");
	
	// Interpolate "variables"
	for(const key in variables)
		source = source.replace(
			new RegExp(`\\$(?:{${key}}|${key})`, "g"),
			variables[key],
		);
	
	return new RegExp(source, flags);
}


/**
 * Import an editor's contents as JavaScript, preprocessing if needed.
 *
 * This function (short for "include editor") is needed because Atom's version of
 * {@link module.require} is modified to use its own transpiler and caching APIs,
 * therefore bypassing the usual {@link require.extensions}/{@link require.cache}
 * mechanisms. Since this is only needed in the dev-console, it's not worth going
 * through extra hurdles just to experiment with a WIP.
 *
 * @param {Boolean} [clearCache=false] - Bypass cached results from earlier calls
 * @param {TextEditor} [editor=null] - The editor to include, if not the current
 * @param {...*} [args] - Auxiliary arguments passed to grammar-specific functions
 * @return {Module|RegExp}
 */
function inced(clearCache = false, editor = null, ...args){
	editor      = editor || atom.workspace.getActiveTextEditor();
	const path  = resolve(editor.getPath() || "");
	const text  = editor.getText() || "";
	const gram  = editor.getGrammar();
	const scope = gram === atom.grammars.nullGrammar ? "source.js" : gram.scopeName;
	
	const [cache, key] = "/" !== path
		? [inced.cache.files, path]
		: [inced.cache.unsaved, `${scope}\0${text}`];
	
	if(clearCache)   delete cache[key];
	if(key in cache) return cache[key];
	
	switch(scope){
		case "source.regexp":
		case "source.regexp.extended":
			return cache[key] = buildRegExp(text, ...args);
		
		case "source.generic-db":
			if(path.endsWith(".tsv")){
				const records = editor.buffer.getLines().map(x => x.split("\t"));
				const fields = records.shift();
				fields[0] = fields[0].replace(/^#\s*/, "");
				const results = [];
				for(const record of records){
					const obj = {__proto__: null};
					for(let i = 0; i < record.length; obj[fields[i]] = record[i++]);
					results.push(obj);
				}
				return results;
			}
			break;
		
		case "source.js":
			// Reuse an already-loaded CJS module
			if(!clearCache && "/" !== path && require.cache[path] instanceof module.constructor)
				return cache[key] = require.cache[path].exports;
			const src = path.endsWith(".mjs") || /^\s*("|')use babel\1|\/\*\*?\s*@jsx(?=\s|\*)|^\s*(?:ex|im)port\b/m.test(text)
				? transpileESM(text, path).code
				: text.replace(/^#![^\n]*/, "");
			cache[key] = {};
			try{ cache[key] = wrapModule(src, path)(); }
			catch(e){ delete cache[key]; throw e; }
			return cache[key];
		
		case "source.coffee":
		case "source.litcoffee":
			const compileOpts = {bare: true, filename: path, inlineMap: true};
			return cache[key] = path.endsWith(".cson")
				? CSON.parse(text)
				: "/" !== path ? require(path) : CoffeeScript.eval(text, compileOpts);
		
		case "source.json":
			return cache[key] = JSON.parse(text.replace(/^\s*\/\/[^\n]*$\n?/gm, ""));
		
		case "source.yaml":
			const yaml = YAML.loadAll(text);
			return cache[key] = yaml.length < 2 ? yaml[0] : yaml;
		
		case "source.plist":
		case "text.xml.plist":
			return cache[key] = loadPlist(text);
		
		case "source.sy":
			if("object" === typeof global.SYON)
				return cache[key] = global.SYON.parse(text);
	}
	throw new TypeError(`Unsupported format: ${gram.name || scope}`);
}


/**
 * Load an NPM module bundled inside Atom.
 *
 * Returns a reference to the same module being used by Atom's core, or if
 * `resolveOnly` is set, an absolute path to a file inside Atom's `asar` file.
 *
 * @example loadFromCore("babel-core") === require("./atom/app.asar/node_modules/babel-core");
 * @param {String} path - Path relative to Atom's `app.asar` file
 * @param {Boolean} [resolveOnly=false] - Don't load anything, simply resolve its path
 * @return {*}
 */
function loadFromCore(path, resolveOnly = false){
	path = resolve(dirname(require.resolve("atom")), `../node_modules/${path}`);
	return resolveOnly ? path : require(path);
}


/**
 * Load and/or convert a TextMate-compatible grammar file.
 *
 * If no argument is given, the current editor's file will be used.
 *
 * @param {String}  [path] - Path to a CSON, JSON, YAML or Plist grammar
 * @param {Package} [pkg] - Package object to register grammar with
 * @param {Boolean} [compileOnly=false] - Don't register or instantiate, just compile
 * @return {Grammar|Object}
 */
function loadGrammar(path = "", pkg = null, compileOnly = false){
	path = path || atom.workspace.getActiveTextEditor().getPath();
	let props;
	
	// XML property list
	if(/\.(tmLanguage|plist)$/i.test(path)){
		const fd  = openSync(path, "r");
		let sig   = Buffer.alloc(8);
		const end = Math.min(readSync(fd, sig, 0, 8), 8);
		closeSync(fd);
		sig = sig.asciiSlice(0, end);
		props = "bplist00" === sig || !sig.includes("<?xml ")
			? loadPlist("", path)
			: Plist.parse(readFileSync(path, "utf8"));
	}
	
	// YAML
	else if(/\.(ya?ml-tmlanguage|syntax)$/i.test(path))
		props = YAML.loadAll(readFileSync(path, "utf8"))[0];
	
	// CSON
	else if(path.endsWith(".cson"))
		props = CSON.readFileSync(path);
	
	// JSON
	else if(path.endsWith(".json")){
		const {isAsar, filePath, asarPath} = Asar.splitPath(path);
		if(isAsar){
			const archive = Asar.createArchive(asarPath);
			path = archive.copyFileOut(filePath);
			props = JSON.parse(readFileSync(path, "utf8"));
		}
		else props = require(path);
	}
	
	if(compileOnly || !props) return props;
	const grammar = atom.grammars.createGrammar(path, props);
	if("object" === typeof pkg && pkg){
		grammar.bundledPackage = false;
		grammar.packageName = pkg.name;
		pkg.grammars.push(grammar);
	}
	grammar.activate();
	return grammar;
}


/**
 * Load and parse an XML, binary, or OpenStep property list.
 *
 * @see plist(5)
 * @param {String|Uint8Array} input
 * @param {String} [path=""]
 * @return {Object|String|Number|Date|Boolean|Array}
 * @internal
 */
function loadPlist(input, path = ""){
	const {spawnSync} = require("child_process");
	const args = ["-x"];
	const opts = {encoding: "utf8"};
	if(!input && path && (path = resolve(path)))
		args.push(path);
	else opts.input = input;
	if(input instanceof Uint8Array || !input.length)
		opts.encoding = "buffer";
	const {stdout} = spawnSync("convert-plist", args, opts);
	return stdout && stdout.length
		? Plist.parse(Buffer.from(stdout).utf8Slice(0))
		: null;
}


/**
 * Convert ESM to something Atom can handle.
 *
 * @param {String} input
 * @param {String} [path=""]
 * @return {Object}
 * @internal
 */
function transpileESM(input, path = ""){
	let {Babel} = transpileESM;
	if(!Babel){
		Babel = transpileESM.Babel = loadFromCore("../node_modules/babel-core/index.js");
		const Logger = loadFromCore("../node_modules/babel-core/lib/transformation/file/logger.js");
		const noop = () => {};
		Logger.prototype.debug = noop;
		Logger.prototype.verbose = noop;
	}
	if(path = path && resolve(path))
		path = "win32" === process.platform ? "file:///" + path.replace(/\\/g, "/") : path;
	input = String(input)
		.replace(/^#![^\n]*/, "")
		.replace(/\bimport\s*\(/g, "(x => Promise.resolve(require(x)))(")
		.replace(/\bimport\.meta\.url\b/g, "__filename");
	if(/\/Labs\/Utils\/lib\/[^/]+\.mjs$/i.test(path))
		input = input.replace(/(?<=[\s[(;{,])(-?(?:0[oObB])?[0-9]+|-?0[Xx][0-9A-Fa-f]+)n(?=[\s\]);},])/g, "BigInt($1)");
	return Babel.transform(input, {
		filename: path,
		blacklist: ["es6.forOf", "useStrict"],
		breakConfig: true,
		optional: ["asyncToGenerator"],
		sourceMap: "inline",
		stage: 0,
	});
}


/**
 * Enclose CommonJS source in a function that returns its `module.exports` object.
 *
 * @param {String} input
 * @param {String} [path="/"]
 * @return {Function}
 * @internal
 */
function wrapModule(input, path = "/"){
	const dir = dirname(path);
	const req = Object.assign(path => {
		switch(path){
			case "alhadis.utils": path = join(labs, "Utils",      "index.mjs"); break;
			case "eal":           path = join(labs, "EAL",        "index.mjs"); break;
			case "get-options":   path = join(labs, "GetOptions", "index.mjs"); break;
			case "vtt":           path = join(labs, "VTT", "lib", "index.mjs"); break;
		}
		if(/^\.{0,2}\/|^\.{1,2}$/.test(path))
			path = resolve(dir, path);
		const text = readFileSync(path, "utf8");
		const gram = atom.grammars.selectGrammar(path, text);
		return inced(false, {
			getGrammar: () => gram,
			getPath:    () => path,
			getText:    () => text,
		});
	});
	const module = {exports: {}, id: path, filename: path, loaded: false, parent: null, paths: []};
	const params = "exports require module __filename __dirname process global Buffer".split(" ");
	const args   = [module.exports, req, module, path, dir, process, global, Buffer];
	return new Function(...params, `return (function(){${input}\nreturn module.exports}).call(this)`).bind(global, ...args);
}

/**
 * @fileoverview Helpers for conservatively loading resources during runtime.
 * Intended to help interactive debugging/experimentation in the dev-console.
 */
"use strict";

const {resolve, dirname} = require("path");
const {readFileSync} = require("fs");

module.exports = {
	buildRegExp,
	inced,
	loadFromCore,
	loadGrammar,
	transpileESM,
	wrapModule,
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
	
	const [cache, key] = path
		? [inced.cache.files, path]
		: [inced.cache.unsaved, `${scope}\0${text}`];
	
	if(clearCache)   delete cache[key];
	if(key in cache) return cache[key];
	
	switch(scope){
		case "source.regexp":
		case "source.regexp.extended":
			return cache[key] = buildRegExp(text, ...args);
		
		case "source.js":
			// Reuse an already-loaded CJS module
			if(!clearCache && path && require.cache[path] instanceof module.constructor)
				return cache[key] = require.cache[path].exports;
			const src = path.endsWith(".mjs") || /^\s*("|')use babel\1|\/\*\*?\s*@jsx(?=\s|\*)|^\s*(?:ex|im)port\b/m.test(text)
				? transpileESM(text, path).code
				: text.replace(/^#![^\n]*/, "");
			cache[key] = {};
			try{ cache[key] = wrapModule(src, path)(); }
			catch(e){ delete cache[key]; throw e; }
			return cache[key];
		
		case "source.json":
			return cache[key] = JSON.parse(text.replace(/^\s*\/\/[^\n]*$\n?/gm, ""));
		
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
 * Retrieve a {@link Grammar} instance by scope-name.
 *
 * @example (await loadGrammar("source.js")) === atom.grammars.grammarForId("source.js");
 * @param {String} scope
 * @return {Grammar|NullGrammar}
 * @async
 */
function loadGrammar(scope){
	return new Promise(resolve => {
		const result = atom.grammars.grammarForScopeName(scope);
		if(result) return resolve(result);
		const disposable = atom.grammars.onDidAddGrammar(grammar => {
			if(scope === grammar.scopeName){
				disposable.dispose();
				resolve(grammar);
			}
		});
	});
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
	const req = module.require = Object.assign(path => {
		if(/^\.{0,2}\/|^\.{1,2}$/.test(path))
			path = resolve(dir, path);
		const text = readFileSync(path, "utf8");
		const gram = atom.grammars.selectGrammar(path, text);
		return inced(false, {
			getGrammar: () => gram,
			getPath:    () => path,
			getText:    () => text,
		});
	}, module.require);
	const params = "exports require module __filename __dirname process global Buffer".split(" ");
	const args   = [module.exports, req, module, path, dir, process, global, Buffer];
	return new Function(...params, `return (function(){${input}\nreturn module.exports}).call(this)`).bind(global, ...args);
}

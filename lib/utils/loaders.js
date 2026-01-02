/**
 * @fileoverview Helpers for conservatively loading resources during runtime.
 * Intended to help interactive debugging/experimentation in the dev-console.
 */
"use strict";

const {join, sep, resolve, dirname} = require("path");
const {openSync, readSync, readFileSync, closeSync, existsSync, statSync} = require("fs");
const {pathToFileURL} = require("url");
const home = require("os").homedir();
const labs = join(home, "Labs");
const Asar = process._linkedBinding("electron_common_asar");
const CoffeeScript = loadFromCore("coffee-script");
const CSON = loadFromCore("season");
const YAML = loadFromCore("yaml");
const Less = loadFromCore("less");
const INI  = loadFromCore("ini");
const TOML = require("js-toml");
const Peggy = require("peggy");
const DotEnv = require("dotenv");
const Plist = autoload("plist");
const Babel = autoload(["babel-core", "@babel/core"].reverse());

module.exports = {
	buildRegExp,
	findPackageManifest,
	inced,
	loadFromCore,
	loadGrammar,
	loadPlist,
	parseCSV,
	parseTSV,
	registerGrammar,
	transpileESM,
	wrapModule,
	Asar,
	TOML,
	DotEnv,
	coreLibs: {
		CoffeeScript,
		Babel,
		CSON,
		Less,
		Plist,
		YAML,
		INI,
	},
};

delete (Object.assign(inced, module.exports)).inced;
Object.defineProperty(inced, "cache", {enumerable: true, value: {
	__proto__: null,
	files:   {__proto__: null},
	unsaved: {__proto__: null},
}});


/**
 * Load an NPM module from core if possible, falling back to a filesystem search otherwise.
 *
 * Though this function @uses {@link loadFromCore}, exceptions raised from failed lookups
 * are caught and silently ignored. The function returns `undefined` if none of the requested
 * module name(s) were successfully located and/or loaded.
 *
 * @param {String|String[]} moduleName
 * @param {Boolean} [resolveOnly=false]
 * @return {*}
 */
function autoload(moduleName, resolveOnly = false){
	if(Array.isArray(moduleName)){
		for(const name of moduleName){
			const result = loadFromCore(String(name), resolveOnly);
			if(resolveOnly && existsSync(result) || result)
				return result;
		}
		return;
	}
	let path = loadFromCore(moduleName, resolveOnly);
	if(!existsSync(path))
		path = join(atom.getConfigDirPath(), "node_modules", moduleName);
	if(resolveOnly) return path;
	try{ return require(path); }
	catch(e){ return; }
}


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
		case "source.css": {
			const dir     = ed.getDirectoryPath();
			const baseURL = dir ? pathToFileURL(dir) : null;
			const sheet   = new CSSStyleSheet({baseURL});
			sheet.replaceSync(text);
			dir && Object.defineProperty(sheet, "href", {
				configurable: true,
				enumerable: true,
				writable: false,
				value: ed.getPath(),
			});
			return cache[key] = sheet;
		}
		
		case "source.regexp":
		case "source.regexp.extended":
			return cache[key] = buildRegExp(text, ...args);
		
		case "source.generic-db":
		case "source.csv":
		case "source.dsv":
		case "source.tsv":
			if("source.csv" === scope || path.endsWith(".csv"))
				return cache[key] = parseCSV(text);
			
			// Strip hashes from the header of naïvely-typed TSV data
			if("source.tsv" === scope || path.endsWith(".tsv")){
				const data = "source.generic-db" === scope ? text.replace(/^#\s*/, "") : text;
				return cache[key] = parseTSV(data);
			}
			break;
		
		case "source.dotenv":
			return cache[key] = DotEnv.parse(text);
		
		case "source.ini":
			return cache[key] = INI.parse(text);
		
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
		
		case "source.pegjs":
			const pkgFile = findPackageManifest(path);
			if(pkgFile){
				const {name, repository = {}, main} = require(pkgFile);
				const url = new URL("string" === typeof repository ? url : repository.url);
				const pkg = atom.packages.loadedPackages[name] ?? loadFromCore(name, true);
				if(existsSync(pkg) && "github.com" === url.hostname && url.pathname.startsWith("/atom/")){
					const parser = Peggy.generate(text.replace(/^{{.+?}}$|^{(?!{).+?(?<!})}$/gms, match => match.replace(
						/(?<=[\s=;,]|^)require(\s*\.\s*resolve)?\s*\(\s*('\.?\/[^']*'|"\.?\/[^"]*")\s*\)/gm,
						(match, resolveOnly, path) => {
							path = path.replace(/^'\.?\/+([^']+)'$/, "$1").replace(/^"\.?\/+([^"]+)"$/, "$1");
							path = join(name, dirname(main), path);
							resolveOnly = resolveOnly ? ", true" : "";
							return `loadFromCore("${path}"${resolveOnly})`;
						},
					)));
					// Smoke test
					if(path.endsWith("/scope-selector-parser.pegjs")){
						let keys;
						for(const {rawInjections} of atom.packages.loadedPackages["language-php"].grammars)
							if(rawInjections && (keys = Object.keys(rawInjections)).length > 0){
								parser.parse(keys.sort(({length: a}, {length: b}) => a < b ? 1 : a > b ? -1 : 0)[0]);
								break;
							}
					}
					return cache[key] = parser;
				}
			}
			return cache[key] = Peggy.generate(text);
		
		case "source.json":
			return cache[key] = JSON.parse(text.replace(/^\s*\/\/[^\n]*$\n?/gm, ""));
		
		case "source.toml":
			return cache[key] = TOML.load(text);
		
		case "source.yaml":
			const yaml = YAML.parseAllDocuments(text);
			return cache[key] = (yaml.length < 2 ? yaml[0] : yaml).toJSON();
		
		case "source.plist":
		case "text.xml.plist":
			return cache[key] = loadPlist(text);
		
		case "source.sy":
			if("object" === typeof global.SYON)
				return cache[key] = global.SYON.parse(text);
			break;
		
		case "text.html.basic": {
			const frag = document.createDocumentFragment();
			const div = frag.appendChild(document.createElement("div"));
			div.insertAdjacentHTML("afterend", text);
			div.remove();
			
			// Return lone top-level nodes unboxed, ignoring leading/trailing whitespace
			const trimmed = [...frag.childNodes];
			const isBlank = node => 3 === node.nodeType && !node.data.trim();
			if(isBlank(frag.firstChild)) trimmed.shift();
			if(isBlank(frag.lastChild))  trimmed.pop();
			return (1 === trimmed.length) ? trimmed[0] : frag.childNodes;
		}

		case "text.xml":
		case "text.xml.svg":
		case "text.xml.xsl":
			return cache[key] = new DOMParser().parseFromString(text, "text/xml");
		
		case "text.vtt": {
			// Extract metadata from VTT's header section
			const metadata = {__proto__: null};
			const headerFields = editor.editorElement.querySelectorAll(`.meta.header.vtt
				.variable.assignment.setting-name.vtt:first-child ~
				.constant.other.setting-value.vtt:last-child
			`.trim().replace(/\.([^~\s.]+)/g, ".syntax--$1").replace(/\s+/g, " "));
			for(const valueNode of headerFields){
				const value   = valueNode.textContent.trim();
				const keyNode = valueNode.parentElement.firstElementChild;
				const key     = keyNode.textContent.trim().toLowerCase();
				metadata[key] = value;
			}
			
			// Initialise dummy video-player to force read of VTT file
			const video   = document.createElement("video");
			const track   = document.createElement("track");
			const kind    = metadata.kind     || "captions";
			const srclang = metadata.language || "en";
			const src     = path || `data:text/vtt,${encodeURI(text)}`;
			Object.assign(video, {autoplay: false, controls: true});
			Object.assign(track, {default: true, kind, srclang, src});
			return cache[key] = video.appendChild(track).track;
		}
	}
	throw new TypeError(`Unsupported format: ${gram.name || scope}`);
}


/**
 * Locate the closest NPM package manifest from the given location.
 *
 * @example <caption>Locate manifest of bundled Tree View package</caption>
 *    const treeView = findPackageManifest(loadFromCore("tree-view", true));
 *    treeView === atom.packages.resourcePath + "/node_modules/tree-view/package.json";
 * @param {String} from - Pathname to search from
 * @param {String} [filename="package.json"] - Filename to search for
 * @return {?String} - Path to closest package.json file, or null if one wasn't found
 * @internal
 */
function findPackageManifest(from, filename = "package.json"){
	if(!from) return null;
	if(from.endsWith(filename))
		return from;
	if(statSync(from).isDirectory())
		from = from.replace(/\/*$/, join(sep, "foo.txt"));
	let nextDir = from;
	while((nextDir = dirname(nextDir)) && nextDir && nextDir !== sep){
		const pkgPath = join(nextDir, filename);
		if(existsSync(pkgPath))
			return pkgPath;
	}
	return null;
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
		props = YAML.parseAllDocuments(readFileSync(path, "utf8"))[0].toJSON();
	
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
	
	return !compileOnly && props
		? registerGrammar(props, path, pkg)
		: props;
}


function registerGrammar(grammar, path, pkg = null){
	grammar = atom.grammars.createGrammar(path, grammar);
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
 * Parse a string containing comma-separated values.
 *
 * @example <caption>Simple parsing of a two-column table</caption>
 *    const colours = parseCSV("Name,Hex Value\nRed,#F00\nBlue,#00F\nUV,");
 *    colours[0] == {Name: "Red",  "Hex Value": "#F00"};
 *    colours[1] == {Name: "Blue", "Hex Value": "#00F"};
 *    colours[2] == {Name: "UV",   "Hex Value": ""};
 * @param {String} input
 * @return {ParsedDSV}
 */
function parseCSV(input){
	const NL = /\r?\n|\r|\x85|\u2028|\u2029/g;
	const [comma, quote, newline] = (function*(input){
		let i = 0, next;
		for(;;) if(!input.includes(next = String.fromCodePoint(i++)))
			yield next;
	})(input);
	const [headers, ...records] = input.replace(/^\uFEFF/, "").trimEnd().replace(
		/(?<=^|,)[ \t]*"((?:[^"\r\n\x85\u2028\u2029]|""|\r?\n|\r|\x85|\u2028|\u2029)*)"[ \t]*(?=,|$)/gm,
		(match, str) => str
			.replaceAll(",", comma)
			.replaceAll('""', quote)
			.replace(NL, newline)
	).split(NL).map(line => line
		.split(",")
		.map(cell => cell
			.replaceAll(comma, ",")
			.replaceAll(quote, '"')
			.replaceAll(newline, "\n")));
	return records.map(record => {
		const obj = {__proto__: null};
		for(let h = 0; h < headers.length; ++h)
			obj[headers[h]] = record[h];
		return obj;
	});
}


/**
 * Parse a string containing tab-separated values.
 *
 * @example <caption>Simple parsing of a three-column table</caption>
 *    const data = parseTSV("Name\tAge\tCountry\nJohn\t38\tAU\nJane\t40\t\nDoe\t\tUS");
 *    data[0] == {Name: "John", Age: "38", Country: "AU"};
 *    data[1] == {Name: "Jane", Age: "40", Country: ""};
 *    data[2] == {Name: "Doe",  Age: "",   Country: "US"};
 * @param {String} input
 * @return {ParsedDSV}
 */
function parseTSV(input){
	const NL = /\r?\n|\r|\x85|\u2028|\u2029/g;
	const [fields, ...records] = input.split(NL).map(x => x.split("\t"));
	const results = [];
	for(const record of records){
		const obj = {__proto__: null};
		for(let i = 0; i < record.length; obj[fields[i]] = record[i++]);
		results.push(obj);
	}
	return results;
}

/**
 * A list of null-prototype objects keyed with properties enumerated in the
 * order they appeared in the DSV's header line. Values are always strings,
 * and property names are used verbatim (i.e., not recased).
 * @typedef {Object[]} ParsedDSV
 */


/**
 * Convert ESM to something Atom can handle.
 *
 * @param {String} input
 * @param {String} [path=""]
 * @return {Object}
 * @internal
 */
function transpileESM(input, path = ""){
	// Directive used to opt-out of Babel transpilation for simple ESM files
	if(/^\s*(['"])fuck babel\1;$\n?/m.test(input))
		return {code: (RegExp.leftContext + RegExp.rightContext)
			.replace(/^(?:#!.*\n)?\s*/, '"use strict";\n\n')
			.replace(/\bfileURLToPath\(import\.meta\.url\)/g, "__filename")
			.replace(/^(\s*)import\s+({[^{}]+}|\w+)\s+from\s+("[^"]+"|'[^']+')\s*;/gm, (match, indent, imports, source) => {
				const [srcQuote] = source;
				source = source.slice(1, -1);
				if("path" === source && global.pat)
					source = "pat";
				return indent + (/^[^./]/.test(source) && global[source]
					? `const ${imports} = global.${source};`
					: `const ${imports} = require(${srcQuote + source + srcQuote});`);
			})
			.replace(/^(\s*)export\s+function\s+(\w+)/gm, "$1module.exports.$2 = $2;\n$1function $2")
			.replace(/^(\s*)export\s+(?:const|let|var)\s+(\w+)\s*=\s*/gm, "$1module.exports.$2 = ")
			.replace(/^(\s*)export\s+default\s+/gm, "$1module.exports = ")};

	const version = parseFloat(Babel.version);
	if(version < 7){
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
	
	const opts = {filename: path, sourceMap: "inline"};
	if(version < 6) Object.assign(opts, {
		blacklist: ["es6.forOf", "useStrict"],
		breakConfig: true,
		optional: ["asyncToGenerator"],
		stage: 0,
	});
	else Object.assign(opts, {
		sourceType: "unambiguous",
		cwd: loadFromCore("..", true),
		presets: [[loadFromCore("@babel/preset-env", true), {
			shippedProposals: true,
			useBuiltIns: false,
			modules: "commonjs",
			targets: {
				electron: `>= ${process.versions.electron}`,
				node:     `>= ${process.versions.node}`,
			},
		}]],
	});
	return Babel.transform(input, opts);
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

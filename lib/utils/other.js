"use strict";

const fs   = require("fs");
const util = require("util");
const ipc  = require("child_process");
const exec = util.promisify(ipc.exec);

module.exports = {
	$,
	at,
	asciify,
	autotag,
	bc: autotag(bc),
	dc: autotag(dc),
	round,
	getPrecision,
	getProperties,
	getGrammar,
	findGrammar,
	formatBytes,
	mtime,
	wait,
	setTheme,
	tsvTable,
	waitToLoad,
};


/**
 * Decompose Unicode characters into their approximate ASCII equivalents.
 *
 * @example asciify("«cafè»") => "cafe";
 * @param {String} input
 * @return {String}
 */
function asciify(input){
	if(!asciify.table)
		asciify.table = {__proto__: null, ...require("./asciify.json")};
	return String(input)
		.replace(/(?=\s)\P{ASCII}/gu, " ")
		.replace(/\P{ASCII}/gu, char => asciify.table[char] || char)
		.replace(/[^ -~]+g/, "");
}


/**
 * Return a copy of a function that supports tagged template literals.
 *
 * @example
 *    const downcase = autotag(input => String(input).toLowerCase());
 *    downcase("FOOO.")            === "fooo.";
 *    downcase`F${"O".repeat(3)}.` === "fooo.";
 *
 * @param {SSTMF} fn
 * @return {Function}
 */
function autotag(fn){
	/**
	 * @callback SSMF
	 *    Simple, stringifying monadic function. Concretely, this
	 *    refers to a function that expects a single, string-typed
	 *    argument, and returns a string.
	 *
	 * @param {String} input
	 * @param {...*} [args]
	 * @return {String}
	 */
	return {[fn.name]: function(expr, ...args){
		if(Array.isArray(expr)
		&& Array.isArray(expr, expr.raw)
		&& args.length + 1 === expr.length
		&& args.length + 1 === expr.raw.length){
			expr = expr.raw.map((s, i) => s + (args[i] ?? "")).join("");
			args = [];
		}
		return fn.call(this, expr, ...args);
	}}[fn.name];
}


/**
 * Resolve the effective value(s) of a scoped editor setting,
 * computed relative to a cursor's physical location
 *
 * @example
 *    at("editor.softTabs") => false;
 *    at("editor.sections") => ["\f", "^.*Section: "]
 *
 * @param {Cursor} [cursor = ed.getLastCursor()]
 *    Cursor residing over the token whose scopes are being
 *    interrogated. Defaults to the current editor's "last"
 *    cursor.
 *
 * @param  {String} [key=null]
 *    Key-spec for a specific setting, if any. By default,
 *    all root properties defined in a config are returned.
 *
 * @param  {Boolean} [needContext=false]
 * @return {?any|{scopeSelector: string, values: ?any}}
 *    If `needContext` is truthy, return an object containing
 *    the effective value(s) and the selector that defined it.
 *    Otherwise, return the value(s) of the requested setting.
 */
function at(cursor = null, key = null, needContext = false){
	if("string" === typeof cursor)
		[cursor, key] = [key, cursor];
	if(!cursor)
		cursor = atom.workspace.getActiveTextEditor().getLastCursor();
	const scopes = {scope: cursor.getScopeDescriptor().scopes};
	const config = atom.config.getAll(key, scopes).shift();
	if(!(config && Object.hasOwn(config, "value")))
		return needContext ? {__proto__: null} : undefined;
	if(needContext)
		return Object.values(atom.config.getSources(key, scopes)).shift();
	else return config.value;
}


/**
 * Evaluate an expression as bc(1) code.
 *
 * @example bc("2 + 4")  === "6";
 * @example bc`${3 * 2}` === "6";
 * @param {String} expr - A mathematical expression to evaluate
 * @return {String}
 */
function bc(expr){
	expr = expr.trimEnd() + "\n";
	const {stdout} = ipc.spawnSync("bc", ["--quiet", "-l"], {
		input: expr,
		encoding: "utf8",
		windowsHide: true,
	});
	return stdout.trimEnd();
}


/**
 * Evaluate an expression as dc(1) code.
 *
 * @example dc("2 4 +") === "6";
 * @param {String} expr - An RPN expression to evaluate
 * @param {Number} [scale=20] - Number of digits' worth of precision
 * @return {String}
 */
function dc(expr, scale = 20){
	expr = `${scale}k${expr.trimEnd()}p`;
	const {stdout} = ipc.spawnSync("dc", {
		input: expr,
		encoding: "utf8",
		windowsHide: true,
	});
	return stdout.trimEnd();
}


/**
 * Round off a fractional value using arbitrary precision.
 *
 * @param {Number} value
 * @param {Number} [precision = 0]
 * @return {Number}
 */
function round(value, precision = 0){
	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
}


/**
 * Return the number of digits after a value's decimal point.
 *
 * @example getPrecision(8.23); => 2
 * @param {Number} value
 * @return {Number}
 */
function getPrecision(value){
	return /\./.test(value)
		? value.toString().split(".").slice(1).join("").length
		: 0;
}


/**
 * Retrieve a descriptor for each property available on an object.
 *
 * Both inherited and non-enumerable properties are included.
 * The usual rules of prototypal inheritance apply; redefined
 * properties replace their inherited counterparts.
 *
 * @param {Object} subject
 * @return {Map} A list of property descriptors keyed by name.
 * @example getProperties(foo) == Map{"keys" => descriptors}
 * @version Alhadis/Utils@20442bd
 */
function getProperties(subject){
	let object = subject;
	const refs = new WeakSet();
	const ancestry = [subject];
	while((object = Object.getPrototypeOf(object)) && !refs.has(object))
		ancestry.push(object);
	
	const result = new Map();
	for(const obj of ancestry.reverse()){
		const names = Object.getOwnPropertyNames(obj);
		for(const name of names){
			const desc = Object.getOwnPropertyDescriptor(obj, name);
			result.set(name, desc);
		}
	}
	
	return result;
}


/**
 * Retrieve a {@link Grammar} instance by scope-name.
 *
 * @example (await getGrammar("source.js")) === atom.grammars.grammarForId("source.js");
 * @param {String} scope
 * @return {Grammar|NullGrammar}
 * @async
 */
function getGrammar(scope){
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
 * Locate a {@link Grammar} by scope-name or human-readable name.
 *
 * @example findGrammar("JavaScript") == atom.grammars.grammarForId("source.js");
 * @param {String} name
 * @return {Grammar?}
 */
function findGrammar(name){
	name = String(name).toLowerCase();
	const grammar = atom.grammars.grammarForScopeName(name);
	if(grammar) return grammar;
	const nameRegex = new RegExp(name.replace(/[/\\^$*+?{}[\]().|]/g, "\\$&"), "iu");
	const grammars = atom.grammars.getGrammars();
	return (
		grammars.find(grammar => nameRegex.test(grammar.name)) ||
		grammars.find(grammar => grammar.fileTypes.some(ext => name === ext.replace(/^\./, "")))
	);
}


/**
 * Format a number of bytes for human-readable output.
 *
 * @example formatBytes(3524959) == "3.36 MB"
 * @param {Number} bytes
 * @return {String} A reader-friendly representation of filesize.
 * @version Alhadis/Utils@f637338
 */
function formatBytes(bytes){
	let unit;
	for(unit of new Array("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"))
		if(bytes >= 1024) bytes /= 1024; else break;
	return `${Math.round(bytes * 100) / 100} ${unit}`;
}


/**
 * Get or set the modification time of a filesystem object.
 *
 * @throws {Error} If `path` points to a non-existent or unreadable file
 * @example mtime("/tmp/download.pdf", new Date("1990-01-01"));
 * @param {String} path
 * @param {Number|String|Date} [date=null]
 * @return {Date|undefined}
 */
function mtime(path, date = null){
	if(!fs.existsSync(path))
		throw new Error(`No such file: ${path}`);

	const stats = fs.lstatSync(path, {bigint: true});

	// If a new timestamp was passed, update file's modification time
	if(null !== date)
		return fs.utimesSync(path, fs.lstatSync(path, {bigint: true}).atime, date);

	// 	Otherwise, return the current modification time
	const ms = stats.mtimeMs.toString();
	let ns   = stats.mtimeNs.toString();
	if(ns.length > ms.length && ns.startsWith(ms)){
		ns = parseFloat("0." + ns.slice(ms.length));
		return Object.defineProperties(stats.mtime, {
			nanoseconds: {enumerable: true, value: ns},
		});
	}
	return stats.mtime;
}


/**
 * Return a {@link Promise} that resolves after a delay.
 *
 * @param {Number} [delay=100] - Milliseconds to wait
 * @return {Promise}
 */
function wait(delay = 100){
	return new Promise(resolve => {
		setTimeout(() => resolve(), delay);
	});
}


/**
 * Change the active Atom themes.
 *
 * @example setTheme("one-dark").then(() => …);
 * @param {...String} names - Theme IDs, sans suffix.
 * @return {Promise}
 */
function setTheme(...names){
	const [ui, syntax] = names.length < 2
		? [`${names[0]}-ui`, `${names[0]}-syntax`]
		: names;
	
	return Promise.all([
		atom.packages.activatePackage(ui),
		atom.packages.activatePackage(syntax),
	]).then(() => {
		atom.config.set("core.themes", [ui, syntax]);
		atom.themes.addActiveThemeClasses();
		atom.themes.loadBaseStylesheets();
		atom.themes.emitter.emit("did-change-active-themes");
	}).then(() => wait(500));
}


/**
 * Execute a shell-command in a child process.
 *
 * @param {String} command
 * @return {Promise}
 */
async function $({raw}, ...values){
	const source = raw.map((s, i) => s + (values[i] || "")).join("");
	return new Promise((resolve, reject) =>
		exec(source, (error, stdout) => error ? reject(error) : resolve(stdout)));
}


/**
 * Synchronous counterpart to {@link $}.
 *
 * @param {String} command
 * @return {String}
 */
$.sync = function(input, ...values){
	if(input && "object" === typeof input || "object" === typeof input.raw)
		input = input.raw.map((s, i) => s + (values[i] || "")).join("");
	return ipc.execSync(input, {encoding: "utf8"});
};


/**
 * Construct an HTML table from TSV data.
 *
 * @param {String} tsv - Block of text holding tab-delimited data.
 * @return {String} HTML source for a <table> element
 */
function tsvTable(tsv){
	let rows = tsv
		.replace(/^\s+|\s+$/g, "")
		.replace(/\n{2,}/g, "\n\n")
		.split(/\n/);

	const join = (row, tag) => "\t\t<tr>\n"
		+ row.split(/\t/)
			.map(cell => `<${tag}>${cell}</${tag}>`)
			.join("\n")
			.replace(/^/gm, "\t".repeat(3))
		+ "\n\t\t</tr>\n";

	let html = "<table>\n";

	// Split leading rows into a <thead> if a blank row is present.
	const index = rows.indexOf("");
	if(-1 !== index)
		html += "\t<thead>\n"
			+ rows.slice(0, index)
				. map(tr => join(tr, "th"))
				. join("")
			+ "\t</thead>\n";

	// Construct the table's body
	rows = rows.slice(index + 1);
	html += "\t<tbody>\n"
		+ rows.map(tr => join(tr, "td")).join("")
		+ "\t</tbody>\n"
	+ "</html>\n";

	return html;
}


/**
 * Return a {@link Promise} that resolves once a package is activated.
 *
 * @param {String} packageName
 * @return {Promise}
 */
function waitToLoad(packageName){
	return new Promise(resolve => {
		if(atom.packages.isPackageActive(packageName))
			return resolve(atom.packages.getActivePackage(packageName));
		const disposable = atom.packages.onDidActivatePackage(pkg => {
			if(packageName === pkg.name){
				disposable.dispose();
				resolve(pkg);
			}
		});
	});
}

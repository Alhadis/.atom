"use strict";

module.exports = {
	$: async (...$) => (await shell(...$)).stdout,
	round,
	getPrecision,
	wait,
	setTheme,
	pipe,
	shell,
	tsvTable
};


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
		atom.packages.activatePackage(syntax)
	]).then(() => {
		atom.config.set("core.themes", [ui, syntax]);
		atom.themes.addActiveThemeClasses();
		atom.themes.loadBaseStylesheets();
		atom.themes.emitter.emit("did-change-active-themes");
	}).then(() => wait(500));
}


/**
 * Pipe data through a child process.
 *
 * @param {String} input
 * @param {String} command
 * @param {Array} [argv=[]]
 * @return {Promise}
 */
async function pipe(input, cmd, argv = []){
	return await new Promise(done => {
		const {spawn} = require("child_process");
		const process = spawn(cmd, argv);
		let stdout = "";
		let stderr = "";
		process.stdin.write(input);
		process.stdin.end();
		process.stdout.on("data", chunk => stdout += chunk);
		process.stderr.on("data", chunk => stderr += chunk);
		process.on("close", (code, signal) => {
			done({stdout, stderr, code, signal});
		});
	});
}


/**
 * Execute a shell-command in a child process.
 *
 * @param {String} command
 * @return {Promise}
 */
async function shell({raw}, ...values){
	const {exec} = require("child_process");
	const source = raw.map((s,i) => s + (values[i] || "")).join("");
	return await new Promise((resolve, reject) => {
		const process = exec(source, (error, stdout, stderr) => {
			const {exitCode, pid} = process;
			return error
				? reject(error)
				: resolve({exitCode, pid, stdout, stderr})
		});
	});
}


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
		html += `\t<thead>\n`
			+ rows.slice(0, index)
			. map(tr => join(tr, "th"))
			. join("")
			+ `\t</thead>\n`;

	// Construct the table's body
	rows = rows.slice(index + 1);
	html += "\t<tbody>\n"
		+ rows.map(tr => join(tr, "td")).join("")
		+ "\t</tbody>\n"
	+ "</html>\n";

	return html;
}

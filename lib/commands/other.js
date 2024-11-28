"use strict";

const termUsage = require.resolve("../utils/term-usage.sh");
const {playSound, say, scanBarcode} = require("../utils/multimedia.js");
const {getGrammarAtCursor, hasSelectedText, mutate} = require("../utils/buffer.js");
const {getEditor} = require("../utils/commands.js");
const {$} = require("../utils/other.js");


/**
 * @function user:make
 * @summary Run GNU Make from project directory.
 */
atom.commands.add("atom-workspace", "user:make", () =>
	$ `cd '${atom.project.getPaths()[0]}' && make`);


/**
 * @function application:open-in-new-window
 * @summary Open a directory in a new window.
 */
atom.commands.add("atom-workspace", "application:open-in-new-window", async () => {
	const {remote} = require("electron");
	const {filePaths} = await remote.dialog.showOpenDialog({properties: ["openDirectory"]});
	if(filePaths && filePaths.length)
		atom.open({pathsToOpen: filePaths, newWindow: true, devMode: false});
});


/**
 * @function user:eval-css
 * @summary Evaluate buffer as CSS and display the computed CSSOM result.
 * @see {@link atom/language-css#99}
 */
atom.commands.add("atom-text-editor", "user:eval-css", () => {
	const style = document.createElement("style");
	const editor = atom.workspace.getActiveTextEditor();
	style.textContent = editor.getSelectedText() || editor.getText();
	document.documentElement.appendChild(style);
	
	let detail = "";
	for(const rule of Array.from(style.sheet.cssRules))
		detail += rule.cssText + "\n";
	
	style.remove();
	atom.notifications.addInfo("CSSOM Rendition", {detail, dismissable: true});
	return detail;
});


/**
 * @function user:open-external
 * @summary Open a file in whatever program is configured to handle its filetype.
 */
atom.commands.add("atom-workspace", "user:open-external", ({target}) => {
	if(!(target ?? atom.workspace.getActiveTextEditor()?.element)) return;
	const is = target.getAttribute("is");
	let path = null;
	switch(is){
		case "tabs-tab":       path = target.path;      break;
		case "tree-view-file": path = target.getPath(); break;
		default:
			target = target.closest("atom-text-editor");
			path   = target.getModel().getPath();
			break;
	}
	const {existsSync} = require("fs");
	if(path && existsSync(path))
		require("electron").shell.openPath(path);
});


/**
 * @function user:open-box-drawing-cheatsheet
 * @summary Open a cheatsheet of box-drawing characters.
 */
atom.commands.add("atom-workspace", "user:open-box-drawing-cheatsheet", () =>
	atom.workspace.open(`${process.env.HOME}/.files/share/misc/box-drawing.txt`));


/**
 * @function user:open-scope-previews
 * @summary Open a list of TextMate scopes supported by GitHub.com
 * @see https://git.io/Jf1IY
 */
atom.commands.add("atom-workspace", "user:open-scope-previews", () => {
	const {realpathSync} = require("fs");
	const pkgPath = realpathSync(atom.packages.getLoadedPackage("language-etc").path);
	atom.workspace.open(`${pkgPath}/samples/lists/scope-previews.nanorc`);
});


/**
 * @function user:open-syntax-stylesheet
 * @summary Open my syntax-theme's stylesheet.
 */
atom.commands.add("atom-workspace", "user:open-syntax-stylesheet", () =>
	atom.workspace.open(`${atom.getConfigDirPath()}/packages/biro-syntax/index.less`));


/**
 * @function user:toggle-pending-items
 * @summary Toggle pending pane-items (disabled by default)
 */
atom.commands.add("atom-workspace", "user:toggle-pending-items", () => {
	const name = "user.enable-pending-items";
	atom.config.set(name, !atom.config.get(name));
});


/**
 * @function user:specsaver
 * @summary Generate a list of assertions using the current editor's tokens.
 */
atom.commands.add("atom-text-editor", "user:specsaver", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const text = editor.getSelectedText() || editor.getText();
	let result = `lines = grammar.tokenizeLines(${JSON.stringify(text)});\n`;
	
	const grammar = getGrammarAtCursor();
	const lines = grammar.tokenizeLines(text);
	const numLines = lines.length;
	for(let i = 0; i < numLines; ++i){
		const tokens = lines[i];
		const numTokens = tokens.length;
		for(let j = 0; j < numTokens; ++j){
			const value = JSON.stringify(tokens[j].value);
			const scopes = `["${tokens[j].scopes.join('", "')}"]`;
			result += `expect(lines[${i}][${j}]).to.eql({value: ${value}, scopes: ${scopes}});\n`;
		}
	}
	atom.clipboard.write(result);
	return result;
});


/**
 * @function user:compare-usage-metrics
 * @summary Prepend each selected line with a number representing how many times this term
 * appears within Google Books's corpus of texts, according to their Ngrams graph… thing.
 */
atom.commands.add("atom-text-editor", "user:compare-usage-metrics", () => {
	const editor = atom.workspace.getActiveTextEditor();
	mutate(editor, text => text.split(/\n+/).map(word => {
		if(word.trim() && !/^\s*-?\d+\.\d+(?:[eE][-+]?\d+)? /.test(word)){
			let value = $.sync `${termUsage} "${word}"`;
			if(!isNaN(value)){
				value = parseFloat(value).toFixed(100).replace(/0+$/, "");
				return value + " " + word;
			}
		}
		return word;
	}).join("\n"));
});


/**
 * @function media:play-sound
 * @summary Command-wrapped version of {@link playSound}, included mainly for completeness.
 */
atom.commands.add("atom-workspace", "media:play-sound", () =>
	prompt("Enter path of sound file").then(response => playSound(response)));


/**
 * @function media:scan-barcode
 * @summary Scan barcodes displayed by Atom's core `image-view` package.
 */
atom.commands.add(".image-view", "media:scan-barcode", async event => {
	for(const result of await scanBarcode(event.currentTarget)){
		console.info(result);
		const {rawValue, format} = result;
		if(!rawValue) continue;
		atom.notifications.addInfo("Decoded data", {
			detail: rawValue,
			description: `**Type:** \`${format}\``,
			dismissable: true,
		});
	}
});


/**
 * @function media:speak
 * @summary Text-to-speech command leveraging macOS's say(1) utility.
 * @warning Intended for Q.A.D; not intended to replace dedicated screen-readers.
 */
atom.commands.add("atom-text-editor", "media:speak", event => {
	const editor = getEditor(event);
	return hasSelectedText(editor)
		? say(editor.getSelections()
			.map(sel => sel.getText().trim())
			.filter(Boolean)
			.join("\n\n"))
		: prompt("Enter message to be spoken aloud:")
			.then(text => say(text));
});

"use strict";

const {getGrammarAtCursor} = require("../utils/buffer.js");
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

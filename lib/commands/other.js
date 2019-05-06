"use strict";

const {getGrammarAtCursor} = require("../utils/buffer.js");
const {filter, run} = require("../utils/commands.js");
const {$} = require("../utils/other.js");


/**
 * @function user:make
 * @summary Run GNU Make from project directory.
 */
atom.commands.add("atom-workspace", "user:make", () =>
	$ `cd '${atom.project.getPaths()[0]}' && make`);


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
	atom.workspace.open(`${process.env.HOME}/Documents/Box-Drawing.txt`));


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
	const text = (editor.getSelectedText() || editor.getText()).replace(/\n+$/, "");
	let result = `lines = grammar.tokenizeLines(${JSON.stringify(text)});\n`;
	
	const grammar = getGrammarAtCursor();
	const lines = grammar.tokenizeLines(text);
	const numLines = lines.length;
	for(let i = 0; i < numLines; ++i){
		const tokens = lines[i];
		const numTokens = tokens.length;
		for(let j = 0; j < numTokens; ++j){
			let {value, scopes} = tokens[j];
			if(!value || /^\s+$/.test(value)) continue;
			value = JSON.stringify(value);
			scopes = `["${scopes.join('", "')}"]`;
			result += `lines[${i}][${j}].should.eql({value: ${value}, scopes: ${scopes}});\n`;
		}
	}
	atom.clipboard.write(result);
	return result;
});


atom.commands.add("atom-workspace", "user:temp-1", () => {
	if(null !== document.querySelector("atom-dock:hover"))
		document.body.classList.toggle("show-toggle-buttons");
	else{
		const editor = atom.workspace.getActiveTextEditor();
		if(!editor) return;
		switch(editor.getGrammar().scopeName){
			case "source.json":
				const parsed = JSON.parse(editor.getText());
				editor.setText(JSON.stringify(parsed, null, "\t"));
				break;
			case "source.perl":
			case "source.perl.5":{
				const text = editor.getLastSelection().getText() || editor.getText();
				run("perl", ["-M5.14.0", "--"], text);
				break;
			}
		}
	}
});

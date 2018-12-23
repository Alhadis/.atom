"use strict";

const {deindent} = require("../../node_modules/alhadis.utils");
const {dirname} = require("path");
const {inspect} = require("util");
const vm = require("vm");


/**
 * @function user:eval-js
 * @summary Evaluate selected text as JavaScript and display results.
 */
atom.commands.add("atom-text-editor", "user:eval-js", () => {
	const editor = atom.workspace.getActiveTextEditor();
	if(!editor) return;
	
	const selections = editor.getSelectionsOrderedByBufferPosition();
	if(selections.length < 2 && selections[0].isEmpty())
		return atom.notifications.addError("Nothing selected", {dismissable: true});
	
	// Switch working directory to that of the opened file
	const pwd = process.cwd();
	const path = editor.getPath();
	path && process.chdir(dirname(path));
	
	// Evaluate each (non-blank) selection as a separate expression
	for(const selection of selections){
		const text = selection.getText();
		if(!text.trim()) continue;
		const {row, column} = selection.getBufferRange().start;
		const filename = editor.getFileName() || "<unsaved>";
		const location = [filename, row, column].join(":");
		try{
			const result = makeScript(text).runInNewContext({...global}, {filename, row, column, displayErrors: true});
			const detail = "function" === typeof result
				? deindent(result.toString()).replace(/^(?: {2})+/gm, s => "\t".repeat(s.length / 2))
				: inspect(result);
			const buttons = [makeButton(result, detail)].filter(Boolean);
			atom.notifications.addInfo(location, {buttons, detail, dismissable: true});
		}
		catch(error){
			console.dir(error);
			atom.notifications.addError(location, {
				description: error.toString(),
				dismissable: true,
				stack: error.stack,
			});
		}
	}
	
	// Restore previous working directory
	process.chdir(pwd);
});


/**
 * Describe an action button for interacting with an expression result.
 * @see {@link atom.notifications.addNotification}
 * @param {*} value
 * @param {String} [stringified]
 * @return {Object}
 * @internal
 */
function makeButton(value, stringified){
	if(!value) return;
	switch(typeof value){
		// Show object in console
		case "object":
		case "symbol":
			return {
				text: "Show in console",
				className: "icon icon-terminal",
				async onDidClick(){
					await atom.openDevTools();
					console.dir(value);
					this.model.dismiss();
				},
			};
		
		// Copy basic (non-falsy) values to clipboard
		case "string":
		case "number":
			return {
				text: "Copy",
				className: "icon icon-clippy",
				onDidClick(){
					atom.clipboard.write(value);
					this.model.dismiss();
				},
			};
		
		// Edit tabified source of function
		case "function":
			return {
				text: "Open in editor",
				className: "icon icon-code",
				async onDidClick(){
					const editor = await atom.workspace.open();
					editor.setGrammar(atom.grammars.grammarForScopeName("source.js"));
					editor.setText(stringified);
					this.model.dismiss();
				},
			};
	}
}


/**
 * Make an executable from a chunk of JavaScript source.
 * @param {String} source
 * @return {vm.Script}
 * @internal
 */
function makeScript(source){
	let script = null;
	try{ script = new vm.Script(source); }
	catch(error){
		// Hack for code containing top-level return/await statements
		if(SyntaxError === error.constructor && (
			"Illegal return statement" === error.message ||
			/^Unexpected\s/i.test(error.message) && /\bawait\s+/.test(source)
		)) script = new vm.Script(`(async () => {\n${source}\n})()`);
		else throw error;
	}
	return script;
}

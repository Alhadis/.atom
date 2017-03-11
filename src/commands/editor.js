"use strict";

const {round, getPrecision} = require("../utils/other.js");


// Fix for failed indent-detection
atom.commands.add("atom-workspace", "user:unfuck-tabstops", () => {
	const editor = atom.workspace.getActiveTextEditor();
	if(!editor) return;
	const hardenUp = () => atom.commands.dispatch(editor.element, "whitespace:convert-spaces-to-tabs");
	const squashedLines = editor.getText().match(/^\x20{2}(?=\S)/mg);
	
	// Seriously, fuck this tab-stop width.
	if(squashedLines){
		editor.setSoftTabs(true);
		editor.setTabLength(2).then(hardenUp());
	}
	
	else hardenUp();
});


// Prepend `* ` to new JSDoc lines
atom.commands.add("atom-text-editor", "user:jsdoc-newline", event => {
	const editor = atom.workspace.getActiveTextEditor();
	const selection = editor.getLastSelection();
	const {cursor} = selection;
	const {scopes} = cursor.getScopeDescriptor();
	const isJSDoc = -1 !== scopes.indexOf("comment.block.documentation.js");
	
	if(cursor.isAtEndOfLine() && "*/" !== editor.getWordUnderCursor() && isJSDoc && selection.isEmpty()){
		const rowIndex = cursor.getBufferRow();
		const rowRange = editor.bufferRangeForBufferRow(rowIndex);
		const lineText = editor.getTextInBufferRange(rowRange);
		const asterisk = (/^\s*\/\*\*$/.test(lineText) ? " " : "") + "* ";
		editor.transact(10, () => {
			editor.setTextInBufferRange(rowRange, lineText.replace(/\s+$/, ""));
			editor.insertNewlineBelow();
			editor.insertText(asterisk);
		});
	}
	else atom.commands.dispatch(event.target, "editor:newline");
});


// Prepend $ when entering {} in JS templates
atom.commands.add("atom-text-editor", "user:dollar-wrap", () => {
	const editor = atom.workspace.getActiveTextEditor();
	editor.mutateSelectedText(selection => {
		const {scopes} = selection.cursor.getScopeDescriptor();
		const {row, column} = selection.getHeadBufferPosition();
		const prevCharacter = editor.getTextInBufferRange([[row, 0], [row, column]]);
		
		// Fired inside a template literal: prepend dollar sign
		if(!/\$$/.test(prevCharacter)
		&& -1 !== scopes.indexOf("string.quoted.template.js")
		&& -1 === scopes.indexOf("source.js.embedded.source")){
			const range = selection.getBufferRange();
			selection.insertText("${" + selection.getText() + "}");
			selection.setBufferRange(range.translate([0, 2], [0, 2]));
		}
		
		else editor.insertText("{");
	});
});


// Increment each number inside currently-selected ranges.
atom.commands.add("atom-text-editor", "user:increment", event => {
	const editor = atom.workspace.getActiveTextEditor();
	hasSelectedText(editor)
		? bumpSelectedNumbers(event.originalEvent.shiftKey ? 10 : 1, editor)
		: atom.commands.dispatch(event.target, "window:increase-font-size");
});


// Decrement each number inside currently-selected ranges
atom.commands.add("atom-text-editor", "user:decrement", event => {
	const editor = atom.workspace.getActiveTextEditor();
	hasSelectedText(editor)
		? bumpSelectedNumbers(event.originalEvent.shiftKey ? -10 : -1, editor)
		: atom.commands.dispatch(event.target, "window:decrease-font-size");
	
});


function bumpSelectedNumbers(by = 1, editor = null){
	const regexp = /-?(?:\d+(?:\.\d*)?|\.\d+)/g;
	editor = editor || atom.workspace.getActiveTextEditor();
	return editor.mutateSelectedText(selection => {
		const text = selection.getText().replace(regexp, n => {
			n = parseFloat(n);
			return round(n + (n > 0 && n < 1 ? 0.1 : 1.0) * by, getPrecision(n));
		});
		selection.insertText(text, {select: true});
	}, 150);
}

function hasSelectedText(editor){
	return !!(editor && editor.getSelections().map(s => s.getText()).join("").length);
}

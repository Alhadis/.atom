"use strict";

const {round, getPrecision, tsvTable} = require("../utils/other.js");
const {hasSelectedText, mutate} = require("../utils/buffer.js");


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


// Convert TSV data to an HTML <table>
atom.commands.add("atom-text-editor", "user:tsv-to-html", () => {
	const editor = atom.workspace.getActiveTextEditor();
	mutate(editor, tsvTable);
	if(atom.grammars.nullGrammar === editor.getGrammar())
		editor.setGrammar(atom.grammars.grammarsByScopeName["text.html.basic"]);
});


// Line-sorting commands
atom.commands.add("atom-text-editor", {
	"lines:sort-basic":   () => sortLines(false, atom.config.get("lines:ignore-case")),
	"lines:sort-natural": () => sortLines(true,  atom.config.get("lines:ignore-case")),
});


// Show unique lines
atom.commands.add("atom-text-editor", "lines:unique", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text => {
		const uniques = new Set();
		let output = "";
		for(const line of text.split(/\r?\n/)){
			if(uniques.has(line)) continue;
			uniques.add(line);
			output += line + EOL;
		}
		return output;
	});
});


// Show duplicate lines
atom.commands.add("atom-text-editor", "lines:duplicate", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text => {
		const uniques = new Set();
		let output = "";
		for(const line of text.split(/\r?\n/))
			uniques.has(line)
				? output += line + EOL
				: uniques.add(line);
		return output;
	});
});


// Reverse row-order
atom.commands.add("atom-text-editor", "lines:reverse", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text => text.split(/\r?\n/).reverse().join(EOL));
});


// Shuffle lines with pseudo-random ordering
atom.commands.add("atom-text-editor", "lines:shuffle", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text => {
		const lines = text.split(/\r?\n/);
		for(let i = lines.length - 1; i >= 0; --i){
			const r  = Math.floor(Math.random() * (i + 1));
			const A  = lines[i];
			const B  = lines[r];
			lines[i] = B;
			lines[r] = A;
		}
		return lines.join(EOL);
	});
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


function sortLines(natural = false, ignoreCase = null){
	ignoreCase = !!(null === ignoreCase ? natural : ignoreCase);
	const editor = atom.workspace.getActiveTextEditor();
	const sortFn = natural
		? new Intl.Collator("en-AU", {
			usage: "sort",
			numeric: true,
			ignorePunctuation: true,
			sensitivity: ignoreCase ? "base" : "variant"
		}).compare
		: ignoreCase
			? (A, B) => A.toLowerCase().localeCompare(B.toLowerCase())
			: (A, B) => A.localeCompare(B);
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text =>
		text.split(/\r?\n/).sort(sortFn).join(EOL));
}

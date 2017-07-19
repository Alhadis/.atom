"use strict";

const {round, getPrecision, tsvTable} = require("../utils/other.js");
const {hasSelectedText, mutate} = require("../utils/buffer.js");
const EDITOR_PANES = "atom-text-editor:not([mini])";


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


// Commands to force tabstop lengths between 1-10 columns
for(let i = 1; i <= 10; ++i)
	atom.commands.add(EDITOR_PANES, `user:${i}-column-tabstops`, event => {
		const editor = atom.workspace.getActiveTextEditor();
		const width = +event.type.match(/\d+/)[0];
		editor.setTabLength(width);
	});


// Prepend `* ` to new JSDoc lines
atom.commands.add(EDITOR_PANES, "user:jsdoc-newline", event => {
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
atom.commands.add(EDITOR_PANES, "user:dollar-wrap", () => {
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
atom.commands.add(EDITOR_PANES, "user:increment", event => {
	const editor = atom.workspace.getActiveTextEditor();
	hasSelectedText(editor)
		? bumpSelectedNumbers(event.originalEvent.shiftKey ? 10 : 1, editor)
		: atom.commands.dispatch(event.target, "window:increase-font-size");
});


// Decrement each number inside currently-selected ranges
atom.commands.add(EDITOR_PANES, "user:decrement", event => {
	const editor = atom.workspace.getActiveTextEditor();
	hasSelectedText(editor)
		? bumpSelectedNumbers(event.originalEvent.shiftKey ? -10 : -1, editor)
		: atom.commands.dispatch(event.target, "window:decrease-font-size");
});


// Convert TSV data to an HTML <table>
atom.commands.add(EDITOR_PANES, "user:tsv-to-html", () => {
	const editor = atom.workspace.getActiveTextEditor();
	mutate(editor, tsvTable);
	if(atom.grammars.nullGrammar === editor.getGrammar())
		editor.setGrammar(atom.grammars.grammarsByScopeName["text.html.basic"]);
});


// Line-sorting commands
atom.commands.add(EDITOR_PANES, {
	"lines:sort-basic":   () => sortLines(false, atom.config.get("lines:ignore-case")),
	"lines:sort-natural": () => sortLines(true,  atom.config.get("lines:ignore-case")),
});


// Show unique lines
atom.commands.add(EDITOR_PANES, "lines:unique", () => {
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
atom.commands.add(EDITOR_PANES, "lines:duplicate", () => {
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
atom.commands.add(EDITOR_PANES, "lines:reverse", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text => text.split(/\r?\n/).reverse().join(EOL));
});


// Shuffle lines with pseudo-random ordering
atom.commands.add(EDITOR_PANES, "lines:shuffle", () => {
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


// Close editor without being nagged over unsaved changes
atom.commands.add(EDITOR_PANES, "editor:close-unprompted", event => {
	const editor = atom.workspace.getActiveTextEditor();
	editor.shouldPromptToSave = () => false;
	atom.commands.dispatch(event.target, "core:close");
});


// Expand escape sequences
atom.commands.add(EDITOR_PANES, "editor:expand-escapes", event => {
	const editor = atom.workspace.getActiveTextEditor();
	const expand = char => JSON.parse(`["${char}"]`)[0];
	const hexChr = code => String.fromCharCode(parseInt(code, 16));
	const octChr = code => String.fromCharCode(parseInt(code, 8));
	mutate(editor, text => text
		.replace(/\\x[A-F0-9]{2}/ig, str => hexChr(str.substr(2)))
		.replace(/\\u[A-F0-9]{4}/ig, str => hexChr(str.substr(2)))
		.replace(/\\u{([A-F0-9]+)}/ig, s => hexChr(RegExp.$1))
		.replace(/\\(0[0-7]{2,})/g, code => octChr(RegExp.$1))
		.replace(/\\[tnrfvb0]/g, escaped => expand(escaped))
		.replace(/\\(?=\S)/g, ""));
});


// Replace Atom's built-in uppercase/lowercase commands with ones that won't auto-select
for(const commandName of ["editor:upper-case", "editor:lower-case"]){
	const handler = /upper/.test(commandName)
		? text => text.toUpperCase()
		: text => text.toLowerCase();
	
	// Play it safe: don't remove default handlers, just make them match nothing.
	let listeners = atom.commands.selectorBasedListenersByCommandName;
	(listeners = listeners[commandName] || []).map(listener => {
		listener.sequenceNumber = Number.MAX_VALUE;
		listener.selector = "lol-nah:root";
	});
	atom.commands.add("atom-text-editor", commandName, event =>
		mutate(event.currentTarget.getModel(), handler, "cursor-words"));
}


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

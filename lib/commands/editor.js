"use strict";

const {round, getPrecision, tsvTable} = require("../utils/other.js");
const {hasSelectedText, mutate} = require("../utils/buffer.js");
const {key, pipe, prompt} = require("../utils/commands.js");
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
		editor.setTabLength(2);
		hardenUp();
	}
	
	else hardenUp();
});


// Inhibit copying to the clipboard without a selection
["user:copy", "user:cut"].map(cmd => atom.commands.add("atom-text-editor", cmd, event =>
	hasSelectedText(event.currentTarget.getModel()) && event.abortKeyBinding()));


// Commands to force tabstop lengths between 1-10 columns
for(let i = 1; i <= 16; ++i)
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
	const isJSDoc = scopes.some(scope => /^comment.block.documentation.(js|tsx?)$/.test(scope));
	
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


// Evaluate a mathematical expression
atom.commands.add(EDITOR_PANES, "user:eval", () => {
	const editor = atom.workspace.getActiveTextEditor();
	if(hasSelectedText(editor))
		mutate(editor, text => String(eval(text)).trim());
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


// Expand indirect character representations (escapes, codepoints, etc)
atom.commands.add(EDITOR_PANES, "editor:expand", event => {
	const editor = atom.workspace.getActiveTextEditor();
	if(hasSelectedText(editor) && "Tab" === event?.originalEvent.key)
		return event?.abortKeyBinding();
	const expansions = editor.getCursors().map(cursor => {
		const position   = cursor.getBufferPosition();
		const range      = editor.bufferRangeForBufferRow(position.row);
		range.end.column = position.column;
		const textBefore = editor.getTextInBufferRange(range);
		
		// Codepoint, hexadecimal
		if(/U\+([0-9A-Fa-f]+)$/g.test(textBefore)
		|| /\\u([A-F0-9]{4})$/ig.test(textBefore)
		|| /\\u{([A-F0-9]+)}$/ig.test(textBefore)
		|| /(?:&#|[%\\](?!...;))x([A-F0-9]{2});?$/ig.test(textBefore)){
			const {leftContext, lastParen} = RegExp;
			range.start.column = leftContext.length;
			return {range, char: String.fromCodePoint(parseInt(lastParen, 16))};
		}
		
		// As above, but in reverse (codepoint of character prefixed by `U-`)
		else if(/U-.$/u.test(textBefore)){
			range.start.column = RegExp.leftContext.length;
			const code = RegExp.lastMatch.codePointAt(2);
			const char = code.toString(16).padStart(2, "0").toUpperCase();
			return {range, char, cursor, select: true};
		}
		
		// Codepoint, octal
		else if(/\\(0[0-7]{2,})$/.test(textBefore)){
			const {leftContext} = RegExp;
			range.start.column = leftContext.length;
			return {range, char: String.fromCodePoint(parseInt(RegExp.$1, 8))};
		}
		
		// C-style single-letter escapes
		else if(/\\[0abtnvfre]$/.test(textBefore)){
			range.start.column = RegExp.leftContext.length;
			const char = "0abtnvfre".indexOf(RegExp.lastMatch[1]);
			return {range, char: "\0\x07\b\t\n\v\f\r\x1B"[char]};
		}
		
		// Caret notation
		else if(/\^[@-_?]$/.test(textBefore)){
			range.start.column = RegExp.leftContext.length;
			const code = RegExp.lastMatch.charCodeAt(1);
			const char = 63 === code ? "\x7F" : String.fromCharCode(code - 64);
			return {range, char};
		}
		
		// Named HTML entity (https://dev.w3.org/html5/html-author/charref)
		else if(/&#?\w+;?$/.test(textBefore)){
			const {lastMatch, leftContext} = RegExp;
			entityEntity.innerHTML = lastMatch;
			const {textContent} = entityEntity;
			if((textContent.length >= lastMatch.length)) return;
			range.start.column = leftContext.length;
			return {range, char: textContent};
		}
	}).filter(Boolean);
	return expansions.length
		? editor.transact(100, () => expansions.map(x => {
			const range = editor.setTextInBufferRange(x.range, x.char);
			if(x.select) x.cursor.selection.setBufferRange(range);
		}))
		: event.abortKeyBinding();
});
// Punching bag for named entity matches
const entityEntity = document.createElement("div");


// Convert TSV data to an HTML <table>
atom.commands.add(EDITOR_PANES, "user:tsv-to-html", () => {
	const editor = atom.workspace.getActiveTextEditor();
	mutate(editor, tsvTable);
	if(atom.grammars.nullGrammar === editor.getGrammar())
		editor.setGrammar(atom.grammars.grammarsByScopeName["text.html.basic"]);
});


// Line-sorting commands
atom.commands.add(EDITOR_PANES, {
	"lines:sort-basic":   () => sortLines(false, !searchOption("caseSensitive")),
	"lines:sort-natural": () => sortLines(true,  !searchOption("caseSensitive")),
	"lines:sort-length":  () => mutate(atom.workspace.getActiveTextEditor(), text => text
		.split(/(?<=\r?\n|\r(?!\n)|\x85|\u2028|\u2029)(?=^)/m)
		.sort(({length: a}, {length: b}) => a < b ? -1 : a > b ? 1 : 0)
		.join("")),
	"lines:sort-regexp":  () => {
		const editor = atom.workspace.getActiveTextEditor();
		const EOL    = editor.buffer.getPreferredLineEnding() || "\n";
		mutate(editor, text => sortForRegExp(text.split(/\r?\n/)).join(EOL));
	},
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


// Save document without a trailing newline
atom.commands.add(EDITOR_PANES, "editor:save-without-trailing-newline", async event => {
	const editor = atom.workspace.getActiveTextEditor();
	const config = "whitespace.ensureSingleTrailingNewline";
	atom.config.set(config, false);
	editor.setText(editor.getText().replace(/\n+$/, ""));
	await atom.commands.dispatch(event.target, "core:save");
	atom.config.set(config, true);
});


// Contextual suppression of auto-closing brackets/quotes
atom.commands.add("atom-text-editor", {
	"user:backtick": key("`", state => {
		const {selection, textBefore} = state;
		if(!state.empty) return;
		const {scopes} = selection.cursor.getScopeDescriptor();
		if(scopes.some(scope => /^string.quoted.template/.test(scope)) && /`$/.test(textBefore)
		|| scopes.includes("source.powershell") && !scopes.some(scope =>
			/^(?:string\.quoted\.single|comment\..*?)\.powershell$/.test(scope)))
			return "`";
	}),
	
	"user:double-quote": key('"', state => {
		const {count, selection, textBefore, textAfter} = state;
		if(!state.empty || count > 1) return;
		const {scopes} = selection.cursor.getScopeDescriptor();
		if(scopes.some(scope => /^punctuation\.definition\.string\.end\./.test(scope))) return;
		if(scopes.some(scope => /^string.quoted.double\./.test(scope)) && /"$/ .test(textBefore)
		|| scopes.some(scope => /^string.quoted.single\./.test(scope)) && /^'"/.test(textAfter)
		|| scopes.some(scope => /^string.quoted.template/.test(scope)) && /^`"/.test(textAfter))
			return '"';
	}),
	
	"user:single-quote": key("'", state => {
		const {count, selection, textBefore, textAfter} = state;
		if(!state.empty || count > 1) return;
		const {scopes} = selection.cursor.getScopeDescriptor();
		if(scopes.some(scope => /^punctuation\.definition\.string\.end\./.test(scope))) return;
		if(scopes.some(scope => /^string.quoted.single\./.test(scope)) && /'$/ .test(textBefore)
		|| scopes.some(scope => /^string.quoted.double\./.test(scope)) && /^"'/.test(textAfter)
		|| scopes.some(scope => /^string.quoted.template/.test(scope)) && /^`'/.test(textAfter))
			return "'";
	}),
	
	"user:square-bracket": key("[",  $ => {
		const {textBefore} = $;
		if(/(?:\\x1B|\\033|\\e|\x1B)$/.test(textBefore))
			return "[";
	}),
	
	"user:curly-bracket": key("{", state => {
		const {selection, textAfter, textBefore} = state;
		const {scopes} = selection.cursor.getScopeDescriptor();
		
		// Prepend dollar signs in JS template literals
		if(!/\$$/.test(textBefore)
		&& -1 !== scopes.indexOf("string.quoted.template.js")
		&& -1 === scopes.indexOf("source.js.embedded.source"))
			return ["${", "}"];
		
		// Give TypeScript the same treatment
		if(!/\$$/.test(textBefore)
		&& !scopes.some(scope => /^meta\.template\.expression\.tsx?$/.test(scope))
		&&  scopes.some(scope => /^string\.template\.tsx?$/.test(scope)))
			return ["${", "}"];
		
		// Make CSON object arrays easier to edit
		if(-1 !== scopes.indexOf("source.coffee")
		&& !/^\]/.test(textAfter)
		&&  /},$/.test(textBefore))
			return "{";
	}),
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


// Reformat JSON
atom.commands.add(EDITOR_PANES, "user:format-json", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const parsed = JSON.parse(editor.getText());
	const config = atom.config.get("editor");
	const indent = config.softTabs ? config.tabLength : "\t";
	editor.setText(JSON.stringify(parsed, null, indent));
});


// Filter selection by piping it through an external command
atom.commands.add("atom-workspace", "user:shell", () =>
	prompt("Enter a command:").then(response => pipe(response)));


// Jump to an absolute byte offset
atom.commands.add(EDITOR_PANES, "editor:go-to-offset", event => {
	const args = [];
	let select = false;
	let {target} = event || {};
	if(target instanceof HTMLElement && "ATOM-TEXT-EDITOR" === target.nodeName)
		target = target.getModel();
	if(atom.workspace.isTextEditor(target) && target.offset > 0){
		args[1] = target.offset;
		select = true;
	}
	prompt("Go to byte:", ...args).then(response => {
		const editor = atom.workspace.getActiveTextEditor();
		if(null == response || !editor) return;
		editor.offset = +response;
	});
	select && prompt.view.inputField.selectAll();
});


// Insert an ascending sequence of numbers
atom.commands.add(EDITOR_PANES, "editor:insert-sequence", () => {
	const editor = atom.workspace.getActiveTextEditor();
	editor.transact(() => {
		const cursors = editor.getCursorsOrderedByBufferPosition();
		const start = Number(cursors[0].selection.getText().trim());
		let i = Number.isNaN(start) ? 1 : start;
		for(const cursor of cursors){
			const range = cursor.selection.getBufferRange();
			editor.setTextInBufferRange(range, String(i++));
		}
	}, 150);
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


// Retrieve the value of a find-and-replace setting
function searchOption(name){
	const pkg = atom.packages.getActivePackage("find-and-replace");
	return pkg ? pkg.mainModule.findOptions[name] : undefined;
}


function sortLines(natural = false, ignoreCase = null){
	ignoreCase = !!(null === ignoreCase ? natural : ignoreCase);
	const editor = atom.workspace.getActiveTextEditor();
	const sortFn = natural
		? new Intl.Collator("en-AU", {
			usage: "sort",
			numeric: true,
			ignorePunctuation: true,
			sensitivity: ignoreCase ? "base" : "variant",
		}).compare
		: ignoreCase
			? (A, B) => A.toLowerCase().localeCompare(B.toLowerCase())
			: (A, B) => A.localeCompare(B);
	const EOL = editor.buffer.getPreferredLineEnding() || "\n";
	mutate(editor, text =>
		text.split(/\r?\n/).sort((a, b) => sortFn(
			a.replace(/^\s+/, ""),
			b.replace(/^\s+/, "")
		)).join(EOL));
}

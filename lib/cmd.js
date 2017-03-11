"use strict";

const {exec} = require("child_process");


// Run GNU Make from project directory
atom.commands.add("atom-workspace", "user:make", () => {
	const projectPath = atom.project.getPaths();
	exec(`cd '${projectPath[0]}' && make`);
});


// Toggle bracket-matcher highlights
atom.commands.add("body", "user:toggle-bracket-matcher", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const el = editor.element.querySelector(".scroll-view");
	el && el.classList.toggle("show-bracket-matcher");
});


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


// Toggle either tree-view or Minimap, based on whether an editor's open
atom.commands.add("body", "user:toggle-sidebar", () => {
	const target = atom.views.getView(atom.workspace);
	const command = atom.workspace.getActivePaneItem()
		? "minimap:toggle"
		: "tree-view:toggle";
	atom.commands.dispatch(target, command);
});


// Toggle font-size between 24px (magnified) and normal size
atom.commands.add("atom-text-editor", "user:zoom-text", () => {
	const size = 11 === atom.config.get("editor.fontSize") ? 24 : 11;
	atom.config.set("editor.fontSize", size);
	atom.workspace.getActiveTextEditor().scrollToCursorPosition();
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


// Straighten text into aligned and padded columns
const alignText = require("./align-columns.js");
atom.commands.add("atom-text-editor", "user:align-columns", event => {
	const editor = atom.workspace.getActiveTextEditor();
	mergeContiguousCursors(editor);
	editor.mutateSelectedText(selection => {
		selectEntireLines(selection);
		const text = selection.getText();
		const aligned = alignText(text);
		(aligned !== text)
			? selection.insertText(aligned, {select: false})
			: atom.commands.dispatch(event.target, "user:unalign-columns");
	});
});

// Perform the inverse of `alignText`: remove cosmetic alignment between columns
atom.commands.add("atom-text-editor", "user:unalign-columns", event => {
	const editor = atom.workspace.getActiveTextEditor();
	mergeContiguousCursors(editor);
	editor.mutateSelectedText(selection => {
		selectEntireLines(selection);
		const text = selection.getText();
		const table = alignText(text, null, {as: "table"});
		if("object" === typeof table){
			const {regexp, string} = table.delimiter;
			const result = table.map(row => row
				.map(cell => cell.replace(regexp, ` ${string} `))
				.join("")).join("\n");
			if(result !== text)
				selection.insertText(result, {select: false});
		}
	});
});


atom.commands.add("atom-text-editor", "user:swap-quotes", event => {
	const editor = atom.workspace.getActiveTextEditor();
	editor.mutateSelectedText(selection => {
		
		if(selection.isEmpty()){
			const {cursor} = selection;
			const {buffer} = selection.editor;
			const prevChar = getCharBefore(cursor);
			const nextChar = getCharAfter(cursor);
			if(isQuote(prevChar)) setCharBefore(cursor, getPrevQuote(prevChar));
			if(isQuote(nextChar)) setCharAfter(cursor,  getNextQuote(nextChar));
		}
		
		// Operate upon a selected ranges
		else{
			const text = selection.getText();
			const swapped = swapQuotes(text);
			if(swapped !== text)
				selection.insertText(swapped, {select: true});
		}
	});
});


// Increment/decrement each number inside selected text.
atom.commands.add("atom-text-editor", "user:increment", event => {
	const editor = atom.workspace.getActiveTextEditor();
	if(!editor || !editor.getSelections().map(s => s.getText()).join("").length)
		return atom.commands.dispatch(event.target, "window:increase-font-size");
	const mult = event.originalEvent.shiftKey ? 10 : 1;
	const regexp = /-?(?:\d+(?:\.\d*)?|\.\d+)/g;
	editor.mutateSelectedText(selection => {
		const text = selection.getText().replace(regexp, n => {
			n = parseFloat(n);
			return round(n + (n > 0 && n < 1 ? 0.1 : 1.0) * mult, getPrecision(n));
		});
		selection.insertText(text, {select: true});
	});
});
atom.commands.add("atom-text-editor", "user:decrement", event => {
	const editor = atom.workspace.getActiveTextEditor();
	if(!editor || !editor.getSelections().map(s => s.getText()).join("").length)
		return atom.commands.dispatch(event.target, "window:decrease-font-size");
	const mult = event.originalEvent.shiftKey ? 10 : 1;
	const regexp = /-?(?:\d+(?:\.\d*)?|\.\d+)/g;
	editor.mutateSelectedText(selection => {
		const text = selection.getText().replace(regexp, n => {
			n = parseFloat(n);
			return round(n - (n > 0 && n < 1 ? 0.1 : 1.0) * mult, getPrecision(n));
		});
		selection.insertText(text, {select: true});
	});
});


// Evaluate buffer as CSS and display the computed CSSOM result.
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


// Force editor settings to comply with Atom's ugly code-style
atom.commands.add("atom-workspace", "user:sponge-mode", () => {
	for(const ed of atom.textEditors.editors){
		const text = ed.getText();
		if(/\t/.test(text)){
			const tabSize = ed.getTabLength();
			ed.setText(text.replace(/\t/g, " ".repeat(tabSize)));
		}
		ed.setTabLength(2);
		ed.setSoftTabs(true);
	}
});


atom.commands.add("atom-workspace", "user:toggle-trendy-faggot-mode", () => {
	atom.themes.onDidChangeActiveThemes(() => atom.reload());
	if(atom.config.get("core.themes").includes("Phoenix-Syntax")){
		atom.packages.enablePackage("autocomplete-plus");
		atom.config.set("minimap.autoToggle", true);
		atom.config.set("core.themes", ["seti-ui", "seti-syntax"]);
		atom.config.set("file-icons.coloured", true);
	}
	else{
		atom.packages.disablePackage("autocomplete-plus");
		atom.config.set("minimap.autoToggle", false);
		atom.config.set("core.themes", ["atom-light-ui", "Phoenix-Syntax"]);
		atom.config.set("file-icons.coloured", false);
	}
});


atom.commands.add("atom-workspace", "user:open-box-drawing-cheatsheet", () =>
	atom.workspace.open(`${process.env.HOME}/Documents/Box-Drawing.txt`));


atom.commands.add("atom-workspace", "file-icons:show-outlines", () =>
	document.body.classList.toggle("file-icons-show-outlines"));


const {specsaver} = require("./specsaver.js");
atom.commands.add("atom-text-editor", "user:specsaver", () => specsaver());

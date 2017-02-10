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
atom.commands.add("body", "user:zoom-text", () => {
	const size = 11 === atom.config.get("editor.fontSize") ? 24 : 11;
	atom.config.set("editor.fontSize", size);
});


// Prepend `* ` to new JSDoc lines
atom.commands.add("atom-text-editor", "user:jsdoc-newline", event => {
	const editor = atom.workspace.getActiveTextEditor();
	const selection = editor.getLastSelection();
	const {cursor} = selection;
	const {scopes} = cursor.getScopeDescriptor();
	
	if(cursor.isAtEndOfLine() && -1 !== scopes.indexOf("comment.block.documentation.js"))
		editor.transact(10, () => {
			editor.insertNewlineBelow();
			editor.insertText("* ");
		});
	else atom.commands.dispatch(event.target, "editor:newline");
});


// Prepend $ when entering {} in JS templates
atom.commands.add("atom-text-editor", "user:dollar-wrap", () => {
	const editor = atom.workspace.getActiveTextEditor();
	
	for(const selection of editor.selections){
		const {scopes} = selection.cursor.getScopeDescriptor();
		
		// Fired inside a template literal: prepend dollar sign
		if(-1 !== scopes.indexOf("string.quoted.template.js")
		&& -1 === scopes.indexOf("source.js.embedded.source")){
			editor.transact(10, () => {
				const range = selection.getBufferRange();
				editor.buffer.setTextInRange([range.start, range.start], "$");
				selection.setBufferRange(range.translate([0, 1]));
				editor.insertText("{");
			});
		}
		
		else editor.insertText("{");
	}
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


atom.commands.add("atom-workspace", "file-icons:show-outlines", () =>
	document.body.classList.toggle("file-icons-show-outlines"));


const {specsaver} = require("./specsaver.js");
atom.commands.add("atom-text-editor", "user:specsaver", () => specsaver());

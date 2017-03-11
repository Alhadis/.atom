"use strict";


/**
 * @function user:toggle-bracket-matcher
 * @summary Toggle bracket-matcher highlights
 */
atom.commands.add("body", "user:toggle-bracket-matcher", () => {
	const editor = atom.workspace.getActiveTextEditor();
	const el = editor.element.querySelector(".scroll-view");
	el && el.classList.toggle("show-bracket-matcher");
});


/**
 * @function user:toggle-sidebar
 * @summary Toggle tree-view or Minimap, depending on whether an editor's open.
 */
atom.commands.add("body", "user:toggle-sidebar", () => {
	const target = atom.views.getView(atom.workspace);
	const command = atom.workspace.getActivePaneItem()
		? "minimap:toggle"
		: "tree-view:toggle";
	atom.commands.dispatch(target, command);
});


/**
 * @function user:zoom-text 
 * @summary Toggle font-size between 24px (magnified) and normal size.
 */
atom.commands.add("atom-text-editor", "user:zoom-text", () => {
	const size = 11 === atom.config.get("editor.fontSize") ? 24 : 11;
	atom.config.set("editor.fontSize", size);
	atom.workspace.getActiveTextEditor().scrollToCursorPosition();
});


/**
 * @function user:toggle-trendy-faggot-mode
 * @summary Toggle a workspace layout more typical of Atom users than mine.
 * 
 * @desc Enabled during development of language-grammars. Seti has
 * very pronounced highlighting, perfect for examining tokenised syntax.
 */
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


/**
 * @function file-icons:show-outlines
 * @summary Display bounding-boxes of visible file-icons.
 *
 * @desc Helps achieve accurate spacing and alignment, especially when focal points
 * are off-centre (producing illusions of misaligned icons). Originally part of
 * File-Icons v1, but removed during a pre-release cleanup of v2: this command is
 * unlikely to interest or benefit other users.
 */
atom.commands.add("atom-workspace", "file-icons:show-outlines", () =>
	document.body.classList.toggle("file-icons-show-outlines"));
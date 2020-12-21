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
 * @function user:toggle-spellcheck
 * @summary Toggle spell-checker highlights
 */
atom.commands.add("body", "user:toggle-spellcheck", () => {
	const scopes = new Set(atom.config.get("spell-check.grammars"));
	const editor = atom.workspace.getActiveTextEditor();
	const scope = editor.getGrammar().scopeName;
	const el = editor.element.querySelector(".scroll-view");
	el && el.classList.toggle("show-spellcheck")
		? scopes.add(scope)
		: scopes.delete(scope);
	atom.config.set("spell-check.grammars", [...scopes]);
});


/**
 * @function tree-view:toggle-ignored-files
 * @summary Toggle the display of files which are ignored by default.
 */
atom.commands.add(".tree-view", "tree-view:toggle-ignored-files", () => {
	const name = "tree-view.hideIgnoredNames";
	const value = atom.config.get(name);
	atom.config.set(name, !value);
});


/**
 * @function user:toggle-ligatures
 * @summary Toggle OpenType ligatures in the editor view
 */
atom.commands.add("body", "user:toggle-ligatures", () =>
	document.body.classList.toggle("disable-ligatures"));


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
atom.commands.add("atom-workspace", "user:zoom-text", () => {
	const editor = atom.workspace.getActiveTextEditor();
	if(editor){
		atom.config.set("editor.fontSize", 14 === atom.config.get("editor.fontSize") ? 24 : 14);
		editor.scrollToCursorPosition({center: true});
		editor.element.focus();
	}
});


/**
 * @function user:toggle-github-syntax
 * @summary Toggle syntax theme between mine and GitHub's colour scheme.
 */
atom.commands.add("atom-workspace", "user:toggle-github-syntax", () => {
	const themes = atom.config.get("core.themes");
	const usual = themes.includes("seti-ui") ? "seti-syntax" : "biro-syntax";
	themes[1] = themes.includes(usual) ? "github-atom-light-syntax" : usual;
	atom.config.set("core.themes", themes);
});


/**
 * @function user:toggle-night-mode
 * @summary Toggle between light and dark themes.
 */
atom.commands.add("atom-workspace", "user:toggle-night-mode", () => {
	atom.themes.onDidChangeActiveThemes(() => atom.reload());
	if(atom.config.get("core.themes").includes("biro-syntax")){
		atom.packages.enablePackage("autocomplete-plus");
		atom.config.set("minimap.autoToggle", true);
		atom.config.set("core.themes", ["seti-ui", "seti-syntax"]);
		atom.config.set("file-icons.coloured", true);
	}
	else{
		atom.packages.disablePackage("autocomplete-plus");
		atom.config.set("minimap.autoToggle", false);
		atom.config.set("core.themes", ["atom-light-ui", "biro-syntax"]);
		atom.config.set("file-icons.coloured", false);
	}
});

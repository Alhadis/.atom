"use strict";


/**
 * @function user:select-item-[1..9]
 * @summary Select 𝑁th pane-item in central pane-container
 */
for(let i = 1; i < 10; atom.commands.add("body", `user:select-item-${i++}`, event => {
	const pane = atom.workspace.getActivePane();
	if(!pane || !pane.container)
		return event.abortKeyBinding();
	const index = event.type.slice(-1);
	const centre = atom.workspace.paneContainers.center;
	centre === atom.workspace.getActivePaneContainer() || centre.activate();
	atom.commands.dispatch(event.target, `pane:show-item-${index}`);
}));


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

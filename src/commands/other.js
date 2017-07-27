"use strict";

const {shell:$} = require("../utils/other.js");


/**
 * @function user:make
 * @summary Run GNU Make from project directory.
 */
atom.commands.add("atom-workspace", "user:make", () =>
	$ `cd '${atom.project.getPaths()[0]}' && make`);


/**
 * @function user:eval-css
 * @summary Evaluate buffer as CSS and display the computed CSSOM result.
 * @see {@link atom/language-css#99}
 */
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


/**
 * @function user:open-box-drawing-cheatsheet
 * @summary Open a cheatsheet of box-drawing characters.
 */
atom.commands.add("atom-workspace", "user:open-box-drawing-cheatsheet", () =>
	atom.workspace.open(`${process.env.HOME}/Documents/Box-Drawing.txt`));


atom.commands.add("atom-workspace", "user:temp-1", () => {
	if(null !== document.querySelector("atom-dock:hover"))
		document.body.classList.toggle("show-toggle-buttons");
	else if(null !== document.querySelector("li[is=tabs-tab].tab:hover")){
		const name = "user:enable-pending-items";
		atom.config.set(name, !atom.config.get(name));
	}
	else{
		const editor = atom.workspace.getActiveTextEditor();
		if("source.json" === editor.getGrammar().scopeName){
			const parsed = JSON.parse(editor.getText());
			editor.setText(JSON.stringify(parsed, null, "\t"));
		}
	}
	
});

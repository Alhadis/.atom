"use strict";

const {exec} = require("child_process");

const commands = {
	
	/* Run GNU Make from project directory */
	"user:make" (){
		const projectPath = atom.project.getPaths();
		exec(`cd '${projectPath[0]}' && make`);
	},


	/* Toggle bracket-matcher highlights */
	"body user:toggle-bracket-matcher" (){
		let el = getRootEditorElement();
		el && el.classList.toggle("show-bracket-matcher");
	},


	/* Reset editor's size to my preferred default, not Atom's */
	"user:reset-font-size" (){
		atom.config.set("editor.fontSize", 11);
	},


	/** XXX: Toggle APL fonts */
	"body user:temp-1": Switch(
		_=> atom.config.set("editor.fontFamily", "Menlig"),
		_=> atom.config.set("editor.fontFamily", "APL385 Unicode")
	),

	
	/* File-Icons: Debugging commands */
	"file-icons:toggle-changed-only":_=> atom.config.set("file-icons.onChanges",   !(atom.config.get("file-icons.onChanges"))),
	"file-icons:toggle-tab-icons":_=>    atom.config.set("file-icons.tabPaneIcon", !(atom.config.get("file-icons.tabPaneIcon"))),
	"file-icons:open-settings":_=>       atom.workspace.open("atom://config/packages/file-icons"),
};


for(let name in commands){
	let cmd = name.split(/\s+/);
	if(cmd.length < 2) cmd.unshift("");
	atom.commands.add(cmd[0] || "atom-workspace", cmd[1], commands[name]);
}

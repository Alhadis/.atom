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
		
		// HACK: Remove when APL package supports scoped font-size
		const size = ed && "source.apl" === ed.getGrammar().scopeName
			? atom.config.getRawScopedValue(["source.apl"], "editor.fontSize")
			: 11;
		
		atom.config.set("editor.fontSize", size);
	},


	/** XXX: Toggle patched font */
	"body user:temp-1": Switch(
		_=> document.body.classList   .add("menlig-alt"),
		_=> document.body.classList.remove("menlig-alt")
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

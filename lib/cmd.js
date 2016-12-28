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


	/* Fix for failed indent-detection */
	"user:unfuck-tabstops" (){
		const editor = global.ed;
		if(!editor) return;
		const hardenUp = () => atom.commands.dispatch(editor.editorElement, "whitespace:convert-spaces-to-tabs");
		const squashedLines = editor.getText().match(/^\x20{2}(?=\S)/mg);
		
		// Seriously, fuck this tab-stop width.
		if(squashedLines){
			editor.setSoftTabs(true);
			editor.setTabLength(2).then(hardenUp());
		}
		
		else hardenUp();
	},


	/* Toggle either tree-view or Minimap, based on whether an editor's open */
	"body user:toggle-sidebar" (){
		const target = atom.views.getView(atom.workspace);
		const command = atom.workspace.getActivePaneItem()
			? "minimap:toggle"
			: "tree-view:toggle";
		atom.commands.dispatch(target, command);
	},


	/* Reset editor's size to my preferred default, not Atom's */
	"user:reset-font-size" (){
		let size = 11;
		
		// HACK: Remove when APL package supports scoped font-size
		if(ed && "source.apl" === ed.getGrammar().scopeName)
			size = atom.config.getRawScopedValue(["source.apl"], "editor.fontSize");

		else if(/\/Box-Drawing\.txt$/.test(ed.getPath()))
			size = 24;
		
		atom.config.set("editor.fontSize", size);
	},


	/** Copy selection/buffer as Atom-core style grammar-specs */
	"atom-text-editor user:specsaver": _=> global.specsaver(),


	/** XXX: Temporary functions */
	"body user:temp-1": ContextualCommand({
		"source.emacs.lisp": "language-emacs-lisp:run-selection",
		"source.css": global.evalCSS,
		"source.coffee" (){
			const repo = atom.workspace.project.repositories[0];
			if(repo && /^git@github\.com:atom\//i.test(repo.getOriginURL())){
				global.ed.setSoftTabs(true);
				return global.ed.setTabLength(2);
			}
		}
	}),

	
	/* File-Icons: Debugging commands */
	"file-icons:toggle-changed-only":_=> atom.config.set("file-icons.onChanges",   !(atom.config.get("file-icons.onChanges"))),
	"file-icons:toggle-tab-icons":_=>    atom.config.set("file-icons.tabPaneIcon", !(atom.config.get("file-icons.tabPaneIcon"))),
	"file-icons:show-outlines":_=>       document.body.classList.toggle("file-icons-show-outlines"),
	"file-icons:open-settings":_=>       atom.workspace.open("atom://config/packages/file-icons"),
};


for(let name in commands){
	let cmd = name.split(/\s+/);
	if(cmd.length < 2) cmd.unshift("");
	atom.commands.add(cmd[0] || "atom-workspace", cmd[1], commands[name]);
}

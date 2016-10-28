"use strict";

/** Disable that useless pending item feature */
atom.workspace.onDidAddPaneItem(({pane}) => pane.setPendingItem(null))


/** Undo whitespace molestation applied by Project-Manager */
const {exec} = require("child_process");
exec(`cd ${__dirname}/.. && make could-you-not`);


/** Clear .DS_Store junk from desktop when saving files */
atom.workspace.observeTextEditors(editor => {
	readModelines(editor);
	editor.emitter.on("did-change-indentation", () => readModelines(editor));
	
	editor.onDidSave(function(){
		setTimeout(_=> exec("~/.files/bin/dsclean ~/Desktop"), 50);
	});
});

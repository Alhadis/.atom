"use strict";

require("./utils.js");
require("./cmd.js");
require("../tmp.js");


// Disable pending items
atom.workspace.onDidAddPaneItem(({pane}) => pane.setPendingItem(null));


// Undo whitespace molestation applied by Project-Manager
const {exec} = require("child_process");
exec(`cd ${__dirname}/.. && make could-you-not`);


atom.workspace.observeTextEditors(editor => {
	
	// Set tab-width to that specified by file's modeline
	editor.emitter.on("did-change-indentation", () => {
		let text = editor.getText();
		let tabStop = text.match(/(?:^|\s)vi(?:m[<=>]?\d+|m?):.*?[: ](?:ts|tabstop)\s*=(\d+)/i);
		if(tabStop){
			const {setTabLength} = editor.constructor.prototype;
			setTabLength.call(editor, +tabStop[1]);
		}
	});
	
	// Clear .DS_Store junk from desktop when saving files
	editor.onDidSave(function(){
		setTimeout(() => exec("~/.files/bin/dsclean ~/Desktop"), 50);
	});
});

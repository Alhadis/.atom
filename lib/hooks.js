"use strict";

/** Disable that useless pending item feature */
atom.workspace.onDidAddPaneItem(({pane}) => pane.setPendingItem(null))


/** Undo whitespace molestation applied by Project-Manager */
const {exec} = require("child_process");
exec(`cd ${__dirname}/.. && make could-you-not`);


/** Clear .DS_Store junk from desktop when saving files */
atom.workspace.observeTextEditors(editor => {
	editor.onDidSave(function(){
		setTimeout(_=> exec("~/.files/bin/dsclean ~/Desktop"), 50);
	});
});


/** Globalise some package variables once they've activated */
atom.packages.onDidActivateInitialPackages(function(){
	global.treeView = atom.packages.activePackages["tree-view"].mainModule.treeView;
});

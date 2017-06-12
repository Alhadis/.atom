"use strict";
const {shell:$} =

// Helper functions
require("./utils/other.js");
require("./utils/global.js");
require("./utils/buffer.js");

// Custom commands
require("./commands/display.js");
require("./commands/editor.js");
require("./commands/other.js");
require("./commands/quotes.js");
require("./commands/text-alignment.js");
require("./commands/pull-requests.js");


// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	pane.setPendingItem(null);
	pane.focus();
});


// Increase token limit
loadGrammar("source.js").then(js => js.maxTokensPerLine = 500);


// Undo whitespace molestation applied by Project-Manager
$ `make could-you-not`;


atom.workspace.observeTextEditors(editor => {
	const {setTabLength} = editor.constructor.prototype;
	
	// Ad-hoc tabstop overrides
	const fixTabs = () => {
		const text = editor.getText();
		
		// Vim modelines: Honour authored tab-width setting
		const tabStop = text.match(/(?:^|\s)vi(?:m[<=>]?\d+|m?):.*?[: ](?:ts|tabstop)\s*=(\d+)/i);
		if(tabStop)
			setTabLength.call(editor, +tabStop[1]);
		
		// Force 8-column tabstops in files that mix 4-space soft-tabs and real tabs.
		// Commonly seen in GNU projects; likely the fault of poor Emacs configuration
		else if(/^ {2,4}\S/m.test(text) && /^\t/m.test(text))
			setTabLength.call(editor, 8);
	};
	fixTabs();
	editor.emitter.on("did-change-indentation", fixTabs);
});

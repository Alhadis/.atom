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
require("./commands/text-alignment.js");
require("./commands/pull-requests.js");


// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	if(!atom.config.get("user:enable-pending-items"))
		pane.setPendingItem(null);
	pane.focus();
});


// Fit window in case Dock was resized
atom.maximize();


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
		else{
			const whitelisted = /source\.(?:js|less|css|coffee)/.test(editor.getGrammar().scopeName);
			if(!whitelisted && /^ {2,4}\S/m.test(text) && /^\t/m.test(text))
				setTabLength.call(editor, 8);
		}
	};
	fixTabs();
	editor.emitter.on("did-change-indentation", fixTabs);
});


// Remove annoying tooltip from status-bar's path-copying tile
const statusBar = atom.packages.loadedPackages["status-bar"];
statusBar.activationPromise.then(() => {
	const {fileInfo} = statusBar.mainModule;
	fileInfo.tooltip.dispose();
	fileInfo.registerTooltip = () => {};
	
	// Use a more subtle acknowledgement when copying to clipboard
	const {element} = fileInfo;
	const {style} = element;
	fileInfo.showCopiedTooltip = () => style.opacity = 0.3;
	element.addEventListener("transitionend", event => {
		if("opacity" === event.propertyName && style.opacity < 1)
			style.opacity = 1;
	});
});

"use strict";
const {$} =

// Helper functions
require("./lib/utils/other.js");
require("./lib/utils/global.js");
require("./lib/utils/buffer.js");

// Custom commands
require("./lib/commands/display.js");
require("./lib/commands/editor.js");
require("./lib/commands/other.js");
require("./lib/commands/text-alignment.js");
require("./lib/commands/pull-requests.js");


// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	if(!atom.config.get("user:enable-pending-items"))
		pane.setPendingItem(null);
	pane.focus();
});


// Increase token limit
loadGrammar("source.js").then(js => js.maxTokensPerLine = 500);


// Force Atom to use tabs when saving CSON files
try{
	const {dirname, resolve} = require("path");
	const atomModules = resolve(dirname(require.resolve("atom")), "../node_modules");
	const CSON = require(`${atomModules}/season`);
	const {stringify} = CSON;
	CSON.stringify = function(object, visitor){
		return stringify.call(this, object, visitor, "\t");
	};
} catch(e){ console.error(e); }


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


// Tidy config to reduce diff-noise
const stringLists = [
	"core.disabledPackages",
	"markdown-preview.grammars",
	"spell-check.grammars",
];
for(const key of stringLists){
	const currentValue = atom.config.get(key);
	const sortedValue = [...new Set(currentValue)].sort();
	if(currentValue.join("\n") !== sortedValue.join("\n"))
		atom.config.set(key, sortedValue);
}

// Delete settings which aren't meant to linger around
const ephemeralKeys = ["user:enable-pending-items"];
for(const keyPath of ephemeralKeys){
	if(undefined !== atom.config.getRawValue(keyPath))
		atom.config.unset(keyPath);
}

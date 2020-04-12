"use strict";

const {dirname, resolve} = require("path");

// Force Atom to use tabs when saving CSON files
try{
	const modulePaths = [resolve(dirname(require.resolve("atom")), "../node_modules")];
	for(const {bundledPackage, metadata, path} of atom.packages.getLoadedPackages())
		if(!bundledPackage && "season" in (metadata.dependencies || {}))
			modulePaths.push(resolve(path, "node_modules"));
	for(const path of modulePaths){
		const CSON = require(`${path}/season`);
		const {stringify} = CSON;
		CSON.stringify = function(object, visitor){
			return stringify.call(this, object, visitor, "\t");
		};
	}
} catch(e){ console.error(e); }


// Ad-hoc tabstop overrides
atom.workspace.observeTextEditors(editor => {
	const {setTabLength} = editor.constructor.prototype;
	
	const fixTabs = () => {
		const text = editor.getText();
		
		// Vim modelines: Honour authored tab-width setting
		const tabStop = text.match(/(?:^|\s)vi(?:m[<=>]?\d+|m?):.*?(?<=:|\s)(?:ts|tabstop)\s*=(\d+)/i);
		if(tabStop)
			setTabLength.call(editor, +tabStop[1]);
		
		// Force 8-column tabstops in files that mix 4-space soft-tabs and real tabs.
		// Commonly seen in GNU projects; likely the fault of poor Emacs configuration.
		// Do the same for C/Assembly code containing a tab after a graphical character;
		// in 99% of cases, 8-column tab-widths are assumed by the author.
		else{
			const {scopeName} = editor.getGrammar();
			const whitelisted = /source\.(?:js|less|css|coffee|gfm)|^text\.md(?=$|\.)/.test(scopeName);
			if(!whitelisted && /^ {2,4}\S/m.test(text) && /^\t/m.test(text)
			|| /\S\t/.test(text) && /(?:^|\.)(?:asm|cpp|c)(?:$|\.)/.test(scopeName))
				setTabLength.call(editor, 8);
		}
	};
	fixTabs();
	editor.emitter.on("did-change-indentation", fixTabs);
});

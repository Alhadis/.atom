"use strict";

const prot = atom.emitter.constructor.prototype;
const emit = prot.emit;
const emissions = Object.defineProperty([], "log", {
	get(){return this.map(e => e[0]).join("\n")}
});

/** Crude debugging method to see what events we can hook into */
function traceEmissions(active){
	prot.emit = !active ? emit : function(name){
		if("did-update-state" !== name){
			emissions.push(Array.from(arguments));
			console.trace(arguments);
		}
		emit.apply(this, arguments);
	};
};

/** Update an editor's settings using those found in any embedded modelines */
function readModelines(editor){
	let text    = editor.getText();
	let tabStop = text.match(/(?:^|\s)vi(?:m[<=>]?\d+|m?):.*?(?<=[:\x20])(?:ts|tabstop)\s*=(\d+)/i);
	if(tabStop){
		const {setTabLength} = editor.constructor.prototype;
		setTabLength.call(editor, +tabStop[1]);
	}
}

/** Return a reference to the active text-editor's root element in the Shadow DOM */
function getRootEditorElement(){
	let el = atom.workspace.getActiveTextEditor().getElement();
	return el ? el.shadowRoot.querySelector(".scroll-view") : null;
}

/** Generate an Atom command to toggle between two grammars */
function makeGrammarFlipCmd(name, a, b){
	const cmd = function(){
		const ed = atom.workspace.getActiveTextEditor();
		switch(ed.getGrammar().scopeName){
			case a: ed.setGrammar(atom.grammars.grammarsByScopeName[b]); break;
			case b: ed.setGrammar(atom.grammars.grammarsByScopeName[a]); break;
		}
	};
	atom.commands.add("body", "user:"+name, cmd);
	return cmd;
}

global.getRootEditorElement = getRootEditorElement;
global.makeGrammarFlipCmd = makeGrammarFlipCmd;
global.traceEmissions = traceEmissions;
global.readModelines = readModelines;
global.print = require("print");
global.emissions = emissions;
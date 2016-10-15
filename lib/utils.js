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


/** Generate specs when preparing PRs for Atom's grammar packages */
function specSnap(){
	const editor   = atom.workspace.getActiveTextEditor();
	const grammar  = editor.getGrammar();
	const text     = editor.getText();
	const {tokens} = grammar.tokenizeLine(text);
	
	let output = "{tokens} = grammar.tokenizeLine('" + text.replace(/'/g, "\\'") + "')\n";
	tokens.forEach((token, index) => {
		let {value, scopes} = token;
		value   = value.replace(/'/g, "\\'");
		scopes  = "['" + scopes.join("', '") + "']";
		output += `expect(tokens[${index}]).toEqual value: '${value}', scopes: ${scopes}\n`;
	});
	
	return output;
}


/**
 * Generate a function to switch between two states each time it runs.
 *
 * @param {Function} a - Initial state
 * @param {Function} b - Alternate state
 * @return {Function}
 */
function Switch(a, b){
	let state = 0;
	a();
	return (...args) => ((state = !state)? b:a)(...args);
}

global.cp  = c => hex(chr(c));
global.chr = c => (c + "").codePointAt(0);
global.hex = n => n.toString(16).toUpperCase();
global.Switch = Switch;
global.getRootEditorElement = getRootEditorElement;
global.traceEmissions = traceEmissions;
global.readModelines = readModelines;
global.print = require("print");
global.emissions = emissions;
global.specSnap = specSnap;

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

/** Return a reference to the active text-editor's root element in the Shadow DOM */
function getRootEditorElement(){
	let el = atom.workspace.getActiveTextEditor().getElement();
	return el ? el.shadowRoot.querySelector(".scroll-view") : null;
}

global.getRootEditorElement = getRootEditorElement;
global.traceEmissions = traceEmissions;
global.emissions = emissions;
global.print = require("print");

"use strict";

const {Disposable} = require("atom");
const {resolve} = require("path");
const {homedir} = require("os");
const {formatBytes, waitToLoad} = require("../utils/other.js");

// Remove annoying tooltip from status-bar's path-copying tile
waitToLoad("status-bar").then(pkg => {
	const {fileInfo} = pkg.mainModule;
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


// Don't block main thread whilst loading UCD
let CharInfo;
const dbPromise = require("../utils/ascii.js").then(() => {
	CharInfo = require("../utils/unicode.js");
	CharInfo.loadDB(resolve(homedir() + "/Labs/Unitome/ucd/UnicodeData.txt"));
});


/**
 * Status-bar tile that displays the character codepoint at the current cursor.
 * @internal
 * @class
 */
class CodepointView{
	constructor(){
		this.element = document.createElement("span");
		this.element.classList.add("cursor-codepoint", "inline-block");
		this.element.appendChild(this.#text = document.createTextNode(""));
		this.editorSubscription = atom.workspace.observeActiveTextEditor(ed => {
			this.cursorSubscription?.dispose();
			this.cursorSubscription = ed?.selectionsMarkerLayer.onDidUpdate(this.update.bind(this));
			this.update();
		});
		if(null == CharInfo)
			dbPromise.then(this.update.bind(this));
	}
	
	/**
	 * Free up memory when no longer needed.
	 * @return {void}
	 */
	destroy(){
		this.cursorSubscription ?.dispose();
		this.editorSubscription ?.dispose();
		this.updateSubscription ?.dispose();
		this.tooltip            ?.destroy();
		this.cursorSubscription = null;
		this.editorSubscription = null;
		this.updateSubscription = null;
		this.tooltip            = null;
	}
	
	/**
	 * Textual content of the tile-view.
	 * @property {String} text
	 */
	#text = "";
	get text(){ return this.#text.nodeValue; }
	set text(to){
		this.#text.nodeValue = to;
		this.element.classList.toggle("hide", !to);
	}
	
	/**
	 * The codepoint currently being displayed. The special value -1 represents EOF.
	 * @property {Number} code
	 */
	#code = null;
	get code(){ return this.#code; }
	set code(to){
		if(null == to && to !== this.#code){
			this.#code = null;
			this.text = "";
		}
		else if(-1 === +to){
			this.#code = null;
			this.text = "EOF";
		}
		else if((to = Math.max(0, ~~to)) !== this.#code){
			this.#code = to;
			let text = "U+" + this.code.toString(16).padStart(4, "0").toUpperCase();
			const info = CharInfo.db[this.code];
			if(info) text += ` ${info.readableName}`;
			this.text = text;
		}
	}
	
	/**
	 * Queue an update to refresh the visible codepoint.
	 * @internal
	 */
	update(){
		if(this.viewUpdatePending) return;
		this.viewUpdatePending = true;
		this.updateSubscription = atom.views.updateDocument(() => {
			this.viewUpdatePending = false;
			const ed = atom.workspace.getActiveTextEditor();
			if(!ed) return this.code = undefined;
			const pos = ed.getCursorBufferPosition();
			const eof = pos.isGreaterThanOrEqual(ed.buffer.getEndPosition());
			this.code = eof ? -1 : ed.buffer.getCharacterAtPosition(pos).codePointAt(0);
		});
	}
}


/**
 * Status-bar tile that shows the cursor's current byte-offset.
 * @internal
 * @class
 */
class CursorOffsetView{
	constructor(){
		this.element = document.createElement("span");
		this.element.classList.add("cursor-offset", "inline-block");
		
		// Register click handler
		const onClick = event => {
			const ed = atom.workspace.getActiveTextEditor();
			ed && atom.commands.dispatch(ed.element, "editor:go-to-offset");
			event.preventDefault();
			event.stopImmediatePropagation();
			return false;
		};
		this.element.addEventListener("click", onClick);
		this.clickSubscription = new Disposable(() => this.element.removeEventListener("click", onClick));
		
		// Pointless anchor tag to keep styling consistent with `<status-bar-cursor>`
		this.goToLink = document.createElement("a");
		this.goToLink.classList.add("inline-block");
		this.element.appendChild(this.goToLink);
		this.goToLink.appendChild(this.#text = document.createTextNode(""));
		
		// Track which editor has input focus
		this.editorSubscription = atom.workspace.observeActiveTextEditor(ed => {
			this.cursorSubscription?.dispose();
			this.cursorSubscription = ed?.selectionsMarkerLayer.onDidUpdate(this.update.bind(this));
			this.update();
		});
		
		// Trigger an update
		this.update();
		
		// Add a tooltip
		this.tooltip = atom.tooltips.add(this.element, {
			title: () => {
				let str = `Offset: ${this.offset} byte`;
				if(1 !== this.offset)   str += "s";
				if(this.offset >= 1024) str += ` (${formatBytes(this.offset)})`;
				return str;
			},
		});
	}
	
	/**
	 * Free up memory when no longer needed.
	 * @return {void}
	 */
	destroy(){
		this.clickSubscription  ?.dispose();
		this.cursorSubscription ?.dispose();
		this.editorSubscription ?.dispose();
		this.tooltip            ?.destroy();
		this.clickSubscription  = null;
		this.cursorSubscription = null;
		this.editorSubscription = null;
		this.tooltip            = null;
	}
	
	/**
	 * The textual content of the status-bar tile.
	 * @property {String}
	 */
	#text = "";
	get text()   { return this.#text.nodeValue; }
	set text(to) { this.#text.nodeValue = to; }
	
	/**
	 * Update the text displayed in the tile.
	 * @internal
	 */
	update(){
		if(this.viewUpdatePending) return;
		this.viewUpdatePending = true;
		this.updateSubscription = atom.views.updateDocument(() => {
			this.viewUpdatePending = false;
			const ed = atom.workspace.getActiveTextEditor();
			if(ed){
				const pos = ed.getCursorBufferPosition();
				const abs = ed.buffer.characterIndexForPosition(pos);
				this.text = `@ ${abs}`;
				this.element.classList.remove("hide");
				this.offset = abs;
			}
			else{
				this.element.classList.add("hide");
				this.text = "";
			}
		});
	}
}

atom.packages.serviceHub.consume("status-bar", ">=1.0.0", statusBar => {
	statusBar.addLeftTile({item: new CursorOffsetView(), priority: 1});
	statusBar.addLeftTile({item: new CodepointView(),    priority: 2});
});

"use strict";

const {Disposable} = require("atom");
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
		this.tooltip            ?.dispose();
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
});

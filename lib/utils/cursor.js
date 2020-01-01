"use strict";

// Make Atom's cursors less agonising to work with
let observer, didFire;

observer = atom.workspace.observeTextEditors(editor => {
	if(didFire) return;
	observer && observer.dispose();
	didFire = true;
	const {constructor: Cursor} = editor.getLastCursor();
	Object.defineProperties(Cursor.prototype, {
		ll:       { get(){ return this.buffer.lineLengthForRow(this.row); }},
		buffer:   { get(){ return this.editor.buffer; }},
		scopes:   { get(){ return this.getScopeDescriptor().scopes; }},
		siblings: { get(){ return this.editor.getCursorsOrderedByBufferPosition(); }},
		next:     { get(){ return this.siblings[this.siblings.indexOf(this) + 1]; }},
		prev:     { get(){ return this.siblings[this.siblings.indexOf(this) - 1]; }},
		token:    { get(){ return this.editor.tokenAt(this.pos); }},
		row: {
			get()   { return this.getBufferRow(); },
			set(to) { this.pos = {...this.getBufferPosition(), row: +to}; },
		},
		col: {
			get()   { return this.getBufferColumn(); },
			set(to) { this.pos = {...this.getBufferPosition(), column: +to}; },
		},
		column: {
			get()   { return this.col; },
			set(to) { this.col = to; },
		},
		pos: {
			get()   { return this.getBufferPosition(); },
			set(to) { this.setBufferPosition(to); },
		},
		restBefore: {
			get()   { return this.buffer.getTextInRange([[0, 0], [this.row, this.col]]); },
			set(to) {        this.buffer.setTextInRange([[0, 0], [this.row, this.col]], to); },
		},
		restAfter:  {
			get()   { return this.buffer.getTextInRange([[this.row, this.col], [Infinity, Infinity]]); },
			set(to) {        this.buffer.setTextInRange([[this.row, this.col], [Infinity, Infinity]], to); },
		},
		textBefore: {
			get()   { return this.buffer.getTextInRange([[this.row, 0], [this.row, this.col]]); },
			set(to) {        this.buffer.setTextInRange([[this.row, 0], [this.row, this.col]], to); },
		},
		textAfter: {
			get()   { return this.buffer.getTextInRange([[this.row, this.col], [this.row, this.ll]]); },
			set(to) {        this.buffer.setTextInRange([[this.row, this.col], [this.row, this.ll]], String(to)); },
		},
		charBefore: {
			get()   { return this.buffer.getTextInRange([[this.row, this.col - 1], [this.row, this.col]]); },
			set(to) {        this.buffer.setTextInRange([[this.row, this.col - 1], [this.row, this.col]], String(to)); },
		},
		charAfter: {
			get()   { return this.buffer.getTextInRange([[this.row, this.col], [this.row, this.col + 1]]); },
			set(to) {        this.buffer.setTextInRange([[this.row, this.col], [this.row, this.col + 1]], String(to)); },
		},
	});
});

didFire && observer.dispose();

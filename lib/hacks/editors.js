// Make Atom's APIs less painful to work with.

const {Range, Point, TextEditor} = require("atom");
const {Cursor, Selection, DisplayMarker} = require("../utils/buffer.js");
const {at} = require("../utils/other.js");

Object.defineProperties(Selection.prototype, {
	valueOf: {value(){ return +this.getBufferRange(); }},
	[Symbol.iterator]: {
		value(){
			const selections = this.editor.getSelectionsOrderedByBufferPosition();
			return selections.map(sel => sel.getBufferRange())[Symbol.iterator]();
		},
	},
});

Object.defineProperties(DisplayMarker.prototype, {
	valueOf:           {value(){ return +this.getHeadBufferPosition(); }},
	[Symbol.iterator]: {value(){ return this.getBufferRange()[Symbol.iterator](); }},
});

Object.defineProperties(Point.prototype, {
	valueOf:           {value(){ return global.buf.characterIndexForPosition(this); }},
	[Symbol.iterator]: {value(){ return [this.row, this.column][Symbol.iterator](); }},
});

Object.defineProperties(Range.prototype, {
	valueOf:           {value(){ return Math.abs(this.end - this.start); }},
	[Symbol.iterator]: {value(){ return [this.start, this.end][Symbol.iterator](); }},
});

Object.defineProperties(TextEditor.prototype, {
	active: {
		get(){
			const pane = atom.workspace.paneForItem(this);
			return pane ? pane.activeItem === this : false;
		},
	},
	at: {
		value(...args){ return at(this.getLastCursor(), ...args); },
		configurable: true,
		writable: false,
	},
	grammar: {
		get(){ return this.getGrammar(); },
		set(to){
			if(!to)
				return atom.textEditors.clearGrammarOverride(this);
			else if("string" === typeof to){
				let name = to.toLowerCase();
				to = atom.grammars.grammarForScopeName(name);
				if(!to){
					name = new RegExp(name.replace(/[/\\^$*+?{}[\]().|]/g, "\\$&"), "iu");
					to = atom.grammars.getGrammars().find(grammar => name.test(grammar.name));
				}
			}
			to && atom.grammars.assignGrammar(this, to);
		},
	},
	offset: {
		get(){
			const point = this.getLastCursor().getBufferPosition();
			return this.buffer.characterIndexForPosition(point);
		},
		set(to){
			if(Array.isArray(to) && to.length > 1){
				const cursor = this.getLastCursor();
				const head = this.buffer.positionForCharacterIndex(+to[0] || 0);
				const tail = this.buffer.positionForCharacterIndex(+to[1] || 0);
				cursor.selection.setBufferRange([head, tail], {autoscroll: true});
				return;
			}
			if(null == to || Number.isNaN(+to)) return;
			const point = this.buffer.positionForCharacterIndex(+to);
			this.getLastCursor().setBufferPosition(point, {autoscroll: true});
		},
	},
	fontSize: {
		get: () => atom.config.get("editor.fontSize"),
		set: to => atom.config.set("editor.fontSize", to),
	},
	fontFamily: {
		get: () => atom.config.get("editor.fontFamily"),
		set: to => atom.config.set("editor.fontFamily", to),
	},
	hideGutter: {
		get()  { this.element.querySelector(".gutter-container").hidden; },
		set(to){ this.element.querySelector(".gutter-container").hidden = !!to; },
	},
	lineHeight: {
		get: () => atom.config.get("editor.lineHeight"),
		set: to => atom.config.set("editor.lineHeight", to),
	},
	lineTokens: {
		value(row = this.getLastCursor().getBufferRow()){
			let column = 0;
			const line = this.tokenizedBuffer.tokenizedLineForRow(row);
			const tokens = [];
			for(const token of line.tokens){
				const {length} = token.value;
				tokens.push({...token, length, row, column, range: [column, column += length]});
			}
			return tokens;
		},
	},
	// TODO: Merge with `at()` function
	tokenAt: {
		value({row, column} = this.getLastCursor().getBufferPosition()){
			return this.lineTokens(row).find(token =>
				column >= token.range[0] && column <= token.range[1]);
		},
	},
});

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

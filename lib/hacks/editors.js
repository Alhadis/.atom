// Make Atom's APIs less painful to work with.

const {Range, Point, TextEditor} = require("atom");
const {loadFromCore} = require("../utils/loaders.js");
const Selection = loadFromCore("../src/selection.js");
const {at} = require("../utils/other.js");

Object.defineProperty(Selection.prototype, Symbol.iterator, {
	value(){
		const selections = this.editor.getSelectionsOrderedByBufferPosition();
		return selections.map(sel => sel.getBufferRange())[Symbol.iterator]();
	},
});

Object.defineProperty(Point.prototype, Symbol.iterator, {
	value(){ return [this.row, this.column][Symbol.iterator](); },
});

Object.defineProperty(Range.prototype, Symbol.iterator, {
	value(){ return [this.start, this.end][Symbol.iterator](); },
});

Object.defineProperties(TextEditor.prototype, {
	at: {
		value(...args){ return at(this.getLastCursor(), ...args); },
		configurable: true,
		writable: false,
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

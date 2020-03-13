"use strict";

const {CompositeDisposable, Disposable, TextEditor} = require("atom");
const {inced, loadFromCore, loadGrammar} = require("./loaders.js");
const {getProperties} = require("./other.js");

Object.defineProperties(global, {
	ed:   {get: () => atom.workspace.getActiveTextEditor()},
	pi:   {get: () => atom.workspace.getActivePaneItem()},
	pane: {get: () => atom.workspace.getActivePane()},
	sel:  {get: () => global.ed.getLastSelection()},
	cur:  {get: () => global.ed.getLastCursor()},
	tb:   {get: () => global.ed.tokenizedBuffer},
	buf:  {get: () => global.ed.buffer},
	lines: {
		get: () => global.ed.buffer.getLines(),
		set: to => global.ed.buffer.setText([...to].join("\n")),
	},
	text: {
		get: () => global.ed.buffer.getText(),
		set: to => global.ed.buffer.setText(to)
	},
	row: {
		get: () => global.cur.getBufferRow(),
		set: to => global.cur.setBufferPosition([to, global.col])
	},
	col: {
		get: () => global.cur.getBufferColumn(),
		set: to => global.cur.setBufferPosition([global.row, to])
	},
	offset: {
		get: () => global.ed.offset,
		set: to => global.ed.offset = to,
	},
});

delete global.root;
Object.assign(global, {
	CompositeDisposable, Disposable,
	inced, loadFromCore, loadGrammar,
	body:     document.body,
	root:     document.documentElement,
	assert:   require("assert"),
	Roff:     require("roff"),
	Electron: require("electron"),
	cp:       require("child_process"),
	net:      require("net"),
	pat:      require("path"),
	fs:       require("fs"),
	os:       require("os"),
	vm:       require("vm"),
	v8:       require("v8"),
	util:     require("util"),
	zlib:     require("zlib"),
	
	traceEmissions: (function(){
		const prot = atom.emitter.constructor.prototype;
		const emit = prot.emit;
		return function(active){
			if(undefined === active)
				active = emit === prot.emit;
			prot.emit = !active ? emit : function(name, ...args){
				if("did-update-state" !== name){
					const trace = {};
					Error.captureStackTrace(trace);
					trace.context = this;
					setTimeout(() => {
						Object.defineProperty(args, "trace", {
							enumerable: false,
							value: trace,
						});
					}, 10);
					console.log(name, args);
				}
				emit.apply(this, arguments);
			};
		};
	}()),
	
	bin(value, a){
		value = value.toString(2).split("");
		const nibbles = [];
		while(value.length > 0)
			nibbles.unshift(value.splice(-4).join("").padStart(4));
		return nibbles.join(" ");
	},
	
	dispatch(command, target = null){
		target = target || atom.views.getView(atom.workspace);
		return atom.commands.dispatch(target, command);
	},
	
	keyGrep(subject, pattern){
		pattern = "string" === typeof pattern
			? new RegExp(pattern)
			: pattern;
		
		const output = {};
		const props = getProperties(subject);
		for(const key of props.keys())
			if(pattern.test(key))
				output[key] = subject[key];
		return output;
	},
	
	// Helper function for toggling between ligature-enabled fonts
	toggleMenlig(){
		const active = "Menlig" === atom.config.get("editor.fontFamily");
		atom.config.set("editor.fontFamily", active ? "Menlo" : "Menlig");
		return !active;
	},
});

// Make editor attributes easier to wrangle
Object.defineProperties(TextEditor.prototype, {
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
	tokenAt: {
		value({row, column} = this.getLastCursor().getBufferPosition()){
			return this.lineTokens(row).find(token =>
				column >= token.range[0] && column <= token.range[1]);
		},
	},
});

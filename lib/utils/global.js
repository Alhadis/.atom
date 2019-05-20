"use strict";

const {resolve} = require("path");
const moduleDir = resolve(__dirname, "../../node_modules");
const {CompositeDisposable, Disposable} = require("atom");
const {getProperties} = require(`${moduleDir}/alhadis.utils`);

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
});


Object.assign(global, {
	CompositeDisposable, Disposable,
	Electron: require("electron"),
	pat:      require("path"),
	fs:       require("fs"),
	
	traceEmissions: (function(){
		const prot = atom.emitter.constructor.prototype;
		const emit = prot.emit;
		return function(active){
			prot.emit = !active ? emit : function(name){
				if("did-update-state" !== name)
					console.trace(arguments);
				emit.apply(this, arguments);
			};
		};
	}()),
	
	bin(value){
		const bits = value.toString(2);
		return value < 0x100000000
			? "0".repeat(32 - bits.length) + bits
			: bits;
	},
	
	dispatch(command, target = null){
		target = target || atom.views.getView(atom.workspace);
		return atom.commands.dispatch(target, command);
	},
	
	inced(clearCache = false){
		const editor = atom.workspace.getActiveTextEditor();
		const {path} = editor.buffer.file;
		if(clearCache) delete require.cache[path];
		return require(path);
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

	loadGrammar(scope){
		return new Promise(resolve => {
			const result = atom.grammars.grammarForScopeName(scope);
			if(result) return resolve(result);
			const disposable = atom.grammars.onDidAddGrammar(grammar => {
				if(scope === grammar.scopeName){
					disposable.dispose();
					resolve(grammar);
				}
			});
		});
	},
});

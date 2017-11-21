"use strict";

const {CompositeDisposable, Disposable} = require("atom");
const {getProperties} = require("alhadis.utils");

Object.defineProperties(global, {
	ed:   {get: () => atom.workspace.getActiveTextEditor()},
	pane: {get: () => atom.workspace.getActivePane()},
	sel:  {get: () => global.ed.getLastSelection()},
	cur:  {get: () => global.ed.getLastCursor()},
	tb:   {get: () => global.ed.tokenizedBuffer},
	buf:  {get: () => global.ed.buffer},
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
	print:    require("print"),
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
		}
	}()),
	
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
	
	fitWindow(){
		const width  = screen.availWidth;
		const height = 797;
		return atom.setWindowDimensions({x: 0, y: 22, width, height, maximized: true});
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
			const result = atom.grammars.grammarsByScopeName[scope];
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


// If we're accessing these on the window global,
// it means we missed something when refactoring…
["name", "path"].map(name => {
	let value = window[name];
	const zap = (action) => {
		if(window.disarmElectricShock)
			return;
		// Don't obstruct program flow. Just raise noise so I notice
		// immediately, instead of relying on other users to do so
		// for me. See file-icons/atom#469
		Promise.resolve().then(() => {
			const details =
				`If you're serious about ${action} window.${name},
				 set \`window.disarmElectricShock = true\`;
				`.replace(/\t|\n/g, "");
			setTimeout(() => console.error(details), 10);
			throw new ReferenceError("\n\tFIX YOUR DAMN BINDINGS");
		});
	};
	Object.defineProperty(window, name, {
		get: () => { zap("reading from"); return value; },
		set: to => { zap("writing to");   value = to; },
	});
});

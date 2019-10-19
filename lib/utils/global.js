"use strict";

const {dirname, resolve} = require("path");
const moduleDir = resolve(__dirname, "../../node_modules");
const {CompositeDisposable, Disposable} = require("atom");
const {getProperties} = require(`${moduleDir}/alhadis.utils`);
const {buildRegExp} = require("./other.js");

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

delete global.root;
Object.assign(global, {
	CompositeDisposable, Disposable,
	body:     document.body,
	root:     document.documentElement,
	Utils:    require("alhadis.utils"),
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
	
	inced(...args){
		const editor = atom.workspace.getActiveTextEditor();
		if("source.regexp" === editor.getGrammar().scopeName)
			return buildRegExp(editor.getText(), ...args);
		else{
			const [clearCache = false] = args;
			const {path} = editor.buffer.file;
			if(clearCache) delete require.cache[path];
			return require(path);
		}
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
	
	loadFromCore(path, resolveOnly = false){
		path = resolve(dirname(require.resolve("atom")), `../node_modules/${path}`);
		return resolveOnly ? path : require(path);
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

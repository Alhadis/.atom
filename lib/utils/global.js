"use strict";

const {CompositeDisposable, Disposable} = require("atom");
const {inced, loadFromCore, loadGrammar, transpileESM} = require("./loaders.js");
const {at, getProperties} = require("./other.js");

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
	tsv: {
		get: () => {
			let update = false;
			const tsv = global.lines.map(line => {
				line = line.split(~line.indexOf("\t") ? "\t" : / +/);
				return new Proxy(line, {
					set(_, key, value){
						line[key] = value;
						if(+key === key >>> 0)
							update = true;
						return true;
					},
				});
			});
			process.nextTick(() => update && (global.tsv = tsv));
			return tsv;
		},
		set: to => global.lines = to.map(line => line.join("\t")),
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
	at, inced, loadFromCore, loadGrammar,
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
	
	...require("./diagnostics.js"),
	
	bin(value, a){
		value = value.toString(2).split("");
		const nibbles = [];
		while(value.length > 0)
			nibbles.unshift(value.splice(-4).join("").padStart(4));
		return nibbles.join(" ");
	},
	
	signbit: n => n ? n < 0 : -Infinity === Infinity / n,
	
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
	
	sortForRegExp(...args){
		const path = process.env.HOME + "/Labs/Utils/lib/misc.mjs";
		const file = fs.readFileSync(path, "utf8");
		const [fn] = file.match(/^export function sortForRegExp.+?\n}$/ms) || [];
		const obj  = {__proto__: null};
		if(!fn) throw new Error("Unable to load ~/Labs/Utils/lib/misc.mjs");
		vm.runInNewContext(fn.replace(/^export\s+/, ""), obj);
		return (global.sortForRegExp = obj.sortForRegExp).apply(global, args);
	},
	
	// Helper function for toggling between ligature-enabled fonts
	toggleMenlig(){
		const active = "Menlig" === atom.config.get("editor.fontFamily");
		atom.config.set("editor.fontFamily", active ? "Menlo" : "Menlig");
		return !active;
	},
});

"use strict";

const {CompositeDisposable, Disposable, TextBuffer, TextEditor} = require("atom");
const {inced, loadFromCore, loadGrammar} = require("./loaders.js");
const {toPoint, toRange} = require("./buffer.js");
const {at, getProperties} = require("./other.js");

Object.defineProperties(global, {
	ed: {
		get: () => atom.workspace.getActiveTextEditor(),
		set: to => {
			if(to instanceof Element)
				to = to.closest("atom-text-editor");
			if(!to || to.destroyed) return;
			if(to instanceof TextBuffer)
				to = [...atom.textEditors.editors].find(ed => to === ed.buffer);
			if(to instanceof TextEditor){
				const pane = atom.workspace.paneForItem(to);
				global.pane = pane;
			}
		},
	},
	pi: {
		get: () => {
			const item = atom.workspace.getActivePaneItem();
			if(item && Object.hasOwn(item, Symbol.toPrimitive)){
				item[Symbol.toPrimitive] = function(hint){
					if("number" !== hint) return this.toString();
					const pane = atom.workspace.paneForItem(this);
					return pane ? pane.items.indexOf(this) : -1;
				};
			}
			return item;
		},
		set: to => {
			if("object" !== typeof to){
				const pane = atom.workspace.getActivePane();
				const {length} = pane.items;
				to = Math.round(Number(to)) % length;
				if(to < 0) to = length + Math.max(-length + 1, to);
				pane.setActiveItem(pane.itemAtIndex(to));
			}
			else if(to instanceof Node){
				for(const pane of atom.workspace.getPanes())
				for(const item of pane.items)
					if(atom.views.getView(item.element).contains(to)){
						pane.activate();
						pane.setActiveItem(item);
						return;
					}
			}
			else for(const pane of atom.workspace.getPanes())
				if(pane === to) return pane.activate();
		},
	},
	pane: {
		get: () => atom.workspace.getActivePane(),
		set: to => {
			const panes = atom.workspace.getPanes();
			if(panes.includes(to))
				return to.activate();
			to = atom.views.getView(to);
			for(const pane of panes)
				if(pane.element.contains(to))
					return pane.activate();
		},
	},
	db:   {get: () => global.ed.displayBuffer},
	tb:   {get: () => global.ed.tokenizedBuffer},
	tl:   {get: () => global.tb.tokenizedLines[global.row]},
	ti:   {get: () => global.tl.tokenIterator},
	mode: {get: () => global.ed.languageMode},
	buf:  {get: () => global.ed.buffer},
	sel: {
		get: () => global.ed.getLastSelection(),
		set: to => global.ed.setSelectedBufferRange(toRange(to)),
	},
	cur: {
		get: () => global.ed.getLastCursor(),
		set: to => global.cur.setBufferPosition(toPoint(to)),
	},
	pos: {
		get: () => global.cur.getBufferPosition(),
		set: to => global.cur.setBufferPosition(toPoint(to)),
	},
	lines: {
		get: () => global.ed.buffer.getLines(),
		set: to => global.ed.buffer.setText([...to].join("\n")),
	},
	path: {
		get: () => global.ed.getPath(),
		set: to => global.ed.buffer.setPath(to),
	},
	text: {
		get: () => global.ed.buffer.getText(),
		set: to => global.ed.buffer.setText(to),
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
		set: to => global.cur.setBufferPosition([to, global.col]),
	},
	col: {
		get: () => global.cur.getBufferColumn(),
		set: to => global.cur.setBufferPosition([global.row, to]),
	},
	offset: {
		get: () => global.ed.offset,
		set: to => global.ed.offset = to,
	},
	g: {
		get: () => global.ed.grammar.edit(),
		set: to => global.ed.grammar = to,
	},
});

delete global.root;
Object.assign(global, {
	CompositeDisposable, Disposable,
	at, inced, loadFromCore, loadGrammar,
	Atom:     require("atom"),
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
	CSON:     loadFromCore("season"),
	YAML:     loadFromCore("js-yaml"),
	Plist:    loadFromCore("plist"),
	Less:     loadFromCore("less"),
	
	...require("./diagnostics.js"),
	
	bin(value){
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

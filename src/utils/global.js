"use strict";

Object.defineProperties(global, {
	ed:   {get: () => atom.workspace.getActiveTextEditor()},
	pane: {get: () => atom.workspace.getActivePane()},
	text: {
		get: () => global.ed.buffer.getText(),
		set: to => global.ed.buffer.setText(to)
	},
});


Object.assign(global, {
	Electron: require("electron"),
	print:    require("print"),
	Path:     require("path"),
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
	
	keyGrep(subject, pattern){
		pattern = "string" === typeof pattern
			? new RegExp(pattern)
			: pattern;
		
		const output = {};
		for(const key of Object.keys(subject).filter(k => pattern.test(k)))
			output[key] = subject[key];
		return output;
	},
	
	globaliseAtomClasses(){
		if(global.CompositeDisposable) return;
		const {CompositeDisposable, Disposable, Emitter, Point, Range} = require("atom");
		global.CompositeDisposable = CompositeDisposable;
		global.Disposable = Disposable;
		global.Emitter = Emitter;
		global.Point = Point;
		global.Range = Range;
	}
});

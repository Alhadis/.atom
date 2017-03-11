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
	
	/**
	 * Round off a fractional value using arbitrary precision.
	 *
	 * @param {Number} value
	 * @param {Number} [precision = 0]
	 * @return {Number}
	 */
	round(value, precision = 0){
		const factor = Math.pow(10, precision);
		return Math.round(value * factor) / factor;
	},
	
	
	/**
	 * Return the number of digits after a value's decimal point.
	 *
	 * @example getPrecision(8.23); => 2
	 * @param {Number} value
	 * @return {Number}
	 */
	getPrecision(value){
		return /\./.test(value)
			? value.toString().split(".").slice(1).join("").length
			: 0;
	},
	
	
	/**
	 * Extend selection ranges to cover each intersecting buffer row.
	 *
	 * NB: Atom's APIs probably offer an easier way to achieve this.
	 * @param {TextEditor|Selection} target
	 * @private
	 */
	selectEntireLines(target){
		if(atom.workspace.isTextEditor(target))
			for(const selection of target.getSelections())
				selectEntireLines(selection);
		else{
			const {start, end} = target.getBufferRange();
			const {buffer} = target.editor;
			start.column = 0;
			end.column = buffer.rangeForRow(end.row).end.column;
			target.setBufferRange([start, end]);
		}
	},
	
	
	/**
	 * Return the character before the designated cursor.
	 *
	 * @param {Cursor} cursor
	 * @return {String}
	 */
	getCharBefore(cursor){
		const position = cursor.getBufferPosition();
		const {row, column} = position;
		
		if(!column) return "";
		return cursor.editor.getTextInBufferRange({
			start: {row, column: column - 1},
			end: position
		});
	},
	
	
	/**
	 * Return the character following a cursor, if any.
	 *
	 * @param {Cursor} cursor
	 * @return {String}
	 */
	getCharAfter(cursor){
		if(cursor.isAtEndOfLine()) return "";
		
		const position = cursor.getBufferPosition();
		const {row, column} = position;
		
		return cursor.editor.getTextInBufferRange({
			start: [row, column + 1],
			end: position
		});
	},
	
	
	/**
	 * Return the character in the row above the cursor.
	 *
	 * @param {Cursor} cursor
	 * @return {String}
	 */
	getCharAbove(cursor){
		const position = cursor.getBufferPosition();
		let {row, column} = position;
		if(!row) return "";
		--row;
		return cursor.editor.getTextInBufferRange({
			start: [row, column],
			end:   [row, column + 1]
		});
	},
	
	
	/**
	 * Return the character in the row below the cursor.
	 *
	 * @param {Cursor} cursor
	 * @return {String}
	 */
	getCharBelow(cursor){
		const position = cursor.getBufferPosition();
		let {row, column} = position;
		++row;
		return cursor.editor.getTextInBufferRange({
			start: [row, column],
			end:   [row, column + 1]
		});
	},


	/**
	 * Set the character immediately before a cursor.
	 *
	 * @param {Cursor} cursor
	 * @param {String} to
	 * @return {String}
	 */
	setCharBefore(cursor, to){
		const position = cursor.getBufferPosition();
		const {row, column} = position;
		
		if(!column) return "";
		return cursor.editor.setTextInBufferRange({
			start: {row, column: column - 1},
			end: position
		}, to);
	},
	
	
	/**
	 * Set the character immediately following a cursor.
	 *
	 * @param {Cursor} cursor
	 * @param {String} to
	 * @return {String}
	 */
	setCharAfter(cursor, to){
		if(cursor.isAtEndOfLine()) return "";
		
		const position = cursor.getBufferPosition();
		const {row, column} = position;
		
		return cursor.editor.setTextInBufferRange({
			start: [row, column + 1],
			end: position
		}, to);
	},
	
	
	/**
	 * Set the character in the row above the cursor.
	 *
	 * @param {Cursor} cursor
	 * @param {String} to
	 * @return {String}
	 */
	setCharAbove(cursor, to){
		const position = cursor.getBufferPosition();
		let {row, column} = position;
		if(!row) return "";
		--row;
		return cursor.editor.setTextInBufferRange({
			start: [row, column],
			end:   [row, column + 1]
		}, to);
	},
	
	
	/**
	 * Set the character in the row below the cursor.
	 *
	 * @param {Cursor} cursor
	 * @param {String} to
	 * @return {String}
	 */
	setCharBelow(cursor, to){
		const position = cursor.getBufferPosition();
		let {row, column} = position;
		++row;
		return cursor.editor.setTextInBufferRange({
			start: [row, column],
			end:   [row, column + 1]
		}, to);
	},
	
		
	
	/**
	 * Return whether a character is used to delimit string data.
	 *
	 * @example isQuote('"') => true
	 * @param {String} input
	 * @return {Boolean}
	 */
	isQuote(input){
		switch(input[0]){
			case '"':
			case "'":
				return true;
		}
		return false;
	},
	
	
	getNextQuote(input){
		if('"' === input) return "'";
		if("'" === input) return '"';
		return "";
	},
	
	getPrevQuote(input){
		return getNextQuote(input);
	},
	
	
	/**
	 * Merge multiple contiguous line selections.
	 *
	 * Cursors separated by at least one non-selected line remain separated.
	 *
	 * @param {TextEditor} editor
	 * @private
	 */
	mergeContiguousCursors(editor){
		editor.mergeSelections((A, B) => {
			const a = Math.max(...A.getBufferRowRange());
			const b = Math.min(...B.getBufferRowRange());
			return a >= (b - 1);
		});
	},
	
	
	swapQuotes(input, [A, B] = ['"', "'"]){
		const unquote = new RegExp(`(\\\\*)(${A}|${B})`, "g");
		return input.replace(unquote, (match, escaped, oldQuote) => {
			const updatedQuote = oldQuote === A ? B : A;
			if(escaped){
				return !!(escaped.length % 2)
					? escaped.replace(/\\$/, "") + updatedQuote
					: (escaped + updatedQuote);
			}
			else return updatedQuote;
		});
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

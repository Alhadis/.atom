"use strict";

const {surround} = require("./buffer.js");

module.exports = {
	
	/**
	 * Generate a handler for inserting a character.
	 *
	 * An auto-closing pair can be specified by returning an array of strings.
	 * 
	 * @param {String} char
	 * @param {Function} handler
	 * @return {Function}
	 */
	key(char, handler){
		return function(event){
			const editor = event.currentTarget
				? event.currentTarget.getModel()
				: atom.workspace.getActiveTextEditor();
			if(!editor) return;
			let nativeInsert = false;
			const selections = editor.getSelectionsOrderedByBufferPosition();
			for(const selection of selections){
				const range  = selection.getBufferRange();
				const empty  = selection.isEmpty();
				const before = [[range.start.row, 0], range.start];
				const after  = [range.end, editor.buffer.rangeForRow(range.end.row).end];
				const result = handler.call(this, {
					editor, selection, range, empty, event,
					textBefore: editor.buffer.getTextInRange(before),
					textAfter:  editor.buffer.getTextInRange(after),
				});
				if(result){
					const before = result[0] || "";
					const after  = result[1] || "";
					surround(before, after, selection);
				}
				else if(!nativeInsert){
					editor.insertText(char);
					nativeInsert = true;
				}
			}
		};
	},
};

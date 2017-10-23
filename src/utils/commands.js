"use strict";

const {hasSelectedText, surround, mutate} = require("./buffer.js");
const {pipe} = require("./other.js");
const {getEditor} =


module.exports = {
	
	/**
	 * Resolve the {@link TextEditor} associated with an event.
	 * 
	 * @param {CustomEvent} event
	 * @return {TextEditor}
	 * @internal
	 */
	getEditor(event){
		return event && event.currentTarget
			? event.currentTarget.getModel()
			: atom.workspace.getActiveTextEditor();
	},
	
	
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
			const editor = getEditor(event);
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
	
	
	/**
	 * Modify buffer contents using standard input/output.
	 *
	 * @param {String} command
	 * @const {Array}  [args=[]]
	 * @param {Object} [options={}]
	 * @return {Promise}
	 */
	async pipeFilter(command, args = [], options = {}){
		const editor = options.editor || atom.workspace.getActiveTextEditor();
		if(editor.hasMultipleCursors())
			editor.mergeSelections(() => true);
		if(options.requireSelection && hasSelectedText(editor))
			return;
		const selection = editor.getLastSelection();
		const input = selection.getText() || editor.getText();
		return await pipe(input, command, args).then(({stdout}) => {
			if(!stdout) return;
			if(!/\n$/.test(input))
				stdout = stdout.replace(/\n$/, "");
			selection.isEmpty()
				? editor.setText(stdout)
				: selection.insertText(stdout, {select: true});
		});
	},
};

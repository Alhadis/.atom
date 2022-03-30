"use strict";

const {mergeContiguousCursors, selectEntireLines} = require("../utils/buffer.js");

/**
 * @function user:align-columns
 * @summary Pad text to produce vertically-aligned columns.
 * @see {@link user:unalign-columns}
 */
atom.commands.add("atom-text-editor", "user:align-columns", event => {
	const editor = atom.workspace.getActiveTextEditor();
	mergeContiguousCursors(editor);
	editor.mutateSelectedText(selection => {
		selectEntireLines(selection);
		const text = selection.getText();
		const aligned = alignText(text);
		(aligned !== text)
			? selection.insertText(aligned, {select: false})
			: atom.commands.dispatch(event.target, "user:unalign-columns");
	});
});


/**
 * @function user:unalign-columns
 * @summary Inverse of {@link user:align-columns}. Strips column padding.
 * @desc Called when executing `align-columns` on already-aligned source.
 */
atom.commands.add("atom-text-editor", "user:unalign-columns", () => {
	const editor = atom.workspace.getActiveTextEditor();
	mergeContiguousCursors(editor);
	editor.mutateSelectedText(selection => {
		selectEntireLines(selection);
		const text = selection.getText();
		const table = alignText(text, null, {as: "table"});
		if("object" === typeof table){
			const {regexp, string} = table.delimiter;
			const result = table.map(row => row
				.map(cell => cell.replace(regexp, ` ${string} `))
				.join("")).join("\n");
			if(result !== text)
				selection.insertText(result, {select: false});
		}
	});
});


/**
 * Pad columns with spaces to align visible character data.
 *
 * @param {String} input
 *    Multiline string data to operate upon.
 *
 * @param {String} [delimiter=null]
 *    Substring delimiting columns inside `input`. If `null`, a "best guess"
 *    is attempted using the most common delimiters used in source code. If
 *    such a guess is unsuccessful, input is returned untouched.
 *
 * @param {Object} [opts={}]
 *    Additional options to refine output (zero values will disable numeric options):
 *
 * @param {String} [opts.align="left"] - Location to insert padding in cells: `"left"` or `"right"`.
 * @param {Boolean} [opts.as="string"] - Format to return padded results in: `"string"` or `"table"/"array"`.
 * @param {Number} [opts.startIndex=0] - Index of first column to start padding from. Defaults to first column.
 * @param {Number}   [opts.minWidth=0] - Minimum width (in characters) each column must consume.
 * @param {Number}    [opts.spacing=1] - Number of spaces added to existing padding between cells.
 * @param {Number}      [opts.limit=0] - Maximum number of columns to align. Remaining columns are left unsplit,
 *                                       and appended to the aligned data as a single trailing column.
 * @return {String|Array[]}
 *    Aligned data, or a multi-dimensional array of padded/parsed strings.
 */
function alignText(input, delimiter = null, opts = {}){
	const {
		align      = "left",
		as         = "string",
		limit      = 0,
		minWidth   = 0,
		spacing    = 1,
		startIndex = 0,
	} = opts;
	
	// Resolve output format
	let keepArrays = false;
	switch(Array === as ? "array" : as.toLowerCase()){
		case "table":
		case "data":
		case "array":
			keepArrays = true;
			break;
	}
	
	if(!delimiter){
		const bestGuess = input.match(/(?:^| +)(:?[=:]|[-=]>|~=|\/{2}|=+)(?: *|$)/);
		// No idea? No action, then.
		if(!bestGuess) return input;
		delimiter = bestGuess[1];
	}
	
	const delimitFirst = /:/.test(delimiter);
	
	// Strip surrounding whitespace when splitting columns
	const regexp = /^\s+$/.test(delimiter)
		? new RegExp(delimiter, "g")
		: new RegExp(` *${delimiter} *`, "g");
	
	const split = row => {
		const cells = [];
		let limited = false;
		let cell, prevIndex = 0;
		regexp.lastIndex = 0;
		while(null !== (cell = regexp.exec(row))){
			const {lastIndex} = regexp;
			const size = cells.push(row.substring(prevIndex, lastIndex));
			if(size >= limit - 1){
				cells.push(row.substring(lastIndex));
				limited = true;
				break;
			}
			prevIndex = lastIndex;
		}
		if(null === cell)
			cells.push(row.substring(prevIndex));
		return [cells, limited];
	};
	
	// Resolve rows and columns
	const table = [];
	const columnWidths = [];
	for(const row of input.split("\n")){
		const [cells, ltd] = limit > 0 && regexp.global
			? split(row)
			: [row.split(regexp), false];
		
		table.push(cells.map((cell, index) => {
			if(index < startIndex || (ltd && null == cells[index + 1]))
				return cell;
			const {length} = cell;
			columnWidths[index] = null == columnWidths[index]
				? length
				: Math.max(columnWidths[index], length);
			return cell;
		}));
	}
	
	// Perform actual column alignment
	const spacingString = spacing ? " ".repeat(spacing) : "";
	const alignToRight = "right" === align;
	const paddedOutput = table.map(row => {
		const paddedRow = row.map((cell, index, array) => {
			// Before starting offset, or final column (don't pad/delimit)
			if(index < startIndex || null == array[index + 1])
				return cell;
			const padLength = Math.max(minWidth, delimiter.length + columnWidths[index] - cell.length);
			const chunks = [cell, " ".repeat(padLength)];
			delimitFirst
				? chunks.splice(1, 0, delimiter.trim())
				: chunks.push(delimiter.trim());
			alignToRight && chunks.reverse();
			return chunks.join("");
		});
		return keepArrays
			? paddedRow
			: paddedRow.join(spacingString);
	});
	const metadata = {
		padBefore: !delimitFirst,
		string:     delimiter,
		regexp:     new RegExp(regexp.source.replace(/\$*$/, "$"), regexp.flags),
	};
	return keepArrays
		? Object.assign(paddedOutput, {delimiter: metadata})
		: paddedOutput.join("\n");
}

"use strict";
module.exports = alignColumns;

/**
 * Pad columns with spaces to align visible character data.
 *
 * @param {String} input
 *    Multiline string data to operate upon.
 *
 * @param {String} [delimiter=null]
 *    Pattern that delimits columns within `input`. If null, a "best guess"
 *    is attempted using the most common delimiters used in source code. If
 *    such a guess is unsuccessful, the input is returned untouched.
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
function alignColumns(input, delimiter = null, opts = {}){
	const {
		align = "left",
		as = "string",
		limit = 0,
		minWidth = 0,
		spacing = 1,
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
		const bestGuess = input.match(/(?:^| +)(:?[=:]|[-=]>|~=|\/{2}|={1,})(?: +|$)/);
		delimiter = bestGuess
			? bestGuess[1]
			: input.match(/[ \t]+(\S?)/)[1];
		
		// Nothing to align? Bail.
		if(!delimiter) return input;
		opts.delimiterUsed = delimiter;
	}
	
	// Strip surrounding whitespace when splitting columns
	const regexp = /^\s+$/.test(delimiter)
		? new RegExp(delimiter, "g")
		: new RegExp(` +${delimiter} *| *${delimiter} +`, "g");
	
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
			const {length} = cell.replace(/^\t+/gm, "");
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
			const padLength = Math.max(minWidth, 2 + delimiter.length + columnWidths[index] - cell.length);
			const chunks = [cell, " ".repeat(padLength)];
			alignToRight && chunks.reverse();
			return chunks.join("") + delimiter.trim() + " ";
		});
		return keepArrays
			? paddedRow
			: paddedRow.join(spacingString);
	});
	return keepArrays
		? paddedOutput
		: paddedOutput.join("\n");
}

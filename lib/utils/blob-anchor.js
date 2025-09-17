/**
 * @version 9550ebb3836e
 * @fileoverview
 *    Port of GitHub's `blob-anchor.ts` module, used by its front-end
 *    to select ranges of text from a file permalink's fragment identifier.
 */
"use strict";

const {Point, Range} = require("atom");

module.exports = {
	formatBlobRange,
	parseBlobOffset,
	parseBlobRange,
};


/**
 * Convert a blob-anchor range into its fragment identifier format.
 *
 * @example
 *    formatBlobRange({start: {row: 3}}) === "L3";
 *    formatBlobRange({start: {row: 3}, end: {row: 5}}) === "L3-L5";
 *    formatBlobRange({start: {row: 3, column: 1}, end: {row: 5, column: 5}}) === "L3C1-L5C5";
 *    formatBlobRange({start: {row: 3, column: 1}, end: {row: 5,}}) === "L3C1-L5";
 * @param {Atom.Range}
 * @return {String}
 * @api public
 */
function formatBlobRange(range){
	range = normaliseRange(range);
	if(range.start.compare(range.end) > 0)
		range = new Range(range.end, range.start);
	const {start, end} = range;
	if(start.column && end.column) return `L${start.row}C${start.column}-L${end.row}C${end.column}`;
	if(start.column)               return `L${start.row}C${start.column}-L${end.row}`;
	if(end.column)                 return `L${start.row}-L${end.row}C${end.column}`;
	if(start.row === end.row)      return `L${start.row}`;
	return `L${start.row}-L${end.row}`;
}


/**
 * Convert a range-compatible object into a range instance.
 *
 * @param {Atom.Range|Atom.Point[]|Object} input
 * @throws {TypeError} Argument must be a valid range object.
 * @return {Atom.Range}
 * @api private
 */
function normaliseRange(input){
	if(input instanceof Range)
		return input;
	if(Array.isArray(input))
		return Range.fromObject(input);
	if("object" === typeof input && null !== input){
		const {start, end = start} = input;
		return Range.fromObject({start, end});
	}
	throw new TypeError(`Invalid range object: ${input}`);
}


/**
 * Parse a line/column pair from a fragment identifier.
 *
 * @example parseBlobOffset("L4C15") === Atom.Point(4, 15);
 * @param {String} input
 * @return {?Atom.Point}
 * @api public
 */
function parseBlobOffset(input){
	const line   = input.match(/L(\d+)/);
	const column = input.match(/C(\d+)/);
	if(!line) return null;
	return new Point(
		parseInt(line[1], 10),
		column ? parseInt(column[1], 10) : null,
	);
}


/**
 * Parse a blob-anchor range a fragment identifier.
 *
 * @example
 *    parseBlobRange("#L3")   === Atom.Range({row: 3}, {row: 3});
 *    parseBlobRange("L3-L5") === Atom.Range({row: 3}, {row: 5});
 *    parseBlobRange("")      === null;
 * @param {String} input
 * @return {?Atom.Range}
 * @api public
 */
function parseBlobRange(input){
	const lines = `${input}`.match(/#?L(\d+)(C(\d+))?/g);
	if(!lines) return null;
	if(1 === lines.length){
		const offset = parseBlobOffset(lines[0]);
		return offset && new Range(offset, offset);
	}
	if(2 === lines.length){
		let start = parseBlobOffset(lines[0]);
		let end   = parseBlobOffset(lines[1]);
		if(!start || !end) return null;
		if(end.compare(start) > 0)
			[start, end] = [end, start];
		return new Range(start, end);
	}
}

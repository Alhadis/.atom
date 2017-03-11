"use strict";

const {exec} = require("child_process");


module.exports = {

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
	 * Execute a shell-command in a child process.
	 *
	 * @param {String} command
	 * @return {ChildProcess}
	 * @see {@link https://nodejs.org/api/child_process.html}
	 */
	shell(command){
		return exec(command);
	}
};

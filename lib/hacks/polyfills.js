"use strict";

// Polyfills/aliases for confusingly-named String methods
const {
	padStart:  padLeft,
	padEnd:    padRight,
	trimLeft:  trimStart,
	trimRight: trimEnd,
} = Object.getOwnPropertyDescriptors(String.prototype);
"".padLeft   || Object.defineProperties(String.prototype, {padLeft,   padRight});
"".trimStart || Object.defineProperties(String.prototype, {trimStart, trimEnd});

Object.fromEntries || Object.defineProperty(Object.prototype, "fromEntries", {
	configurable: true,
	writable: true,
	value(entries){
		const result = {};
		for(const [key, value] of entries)
			result[key] = value;
		return result;
	},
});

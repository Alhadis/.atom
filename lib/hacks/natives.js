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

// Make radices easier to work with
for(const type of [Number, BigInt])
	Object.defineProperties(type.prototype, {
		hex:  {configurable: true, get(){ return this.toString(16).toUpperCase().padStart(2, "0"); }},
		oct:  {configurable: true, get(){ return this.toString(8).padStart(3, "0"); }},
		bits: {configurable: true, get(){ return this.toString(2).padStart(8, "0"); }},
	});

// Make codepoints easier to access
for(const prop of "hex oct bits".split(" "))
	Object.defineProperty(String.prototype, prop, {
		get(){ return [...this].map(x => x.codePointAt(0)[prop]).join(" "); },
		configurable: true,
	});

// Make byte-arrays easier to read
for(const type of [Array, Uint8Array, Uint8ClampedArray])
	Object.defineProperties(type.prototype, {
		hex:  {configurable: true, get(){ return [...this].map(x => (+x).hex).join(" "); }},
		bits: {configurable: true, get(){ return [...this].map(x => (+x).bits).join(" "); }},
	});

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


// https://v8.dev/features/at-method
if("function" !== typeof Array.prototype.at || [1, atom].at(-1) !== atom){
	function at(n){
		n = Math.trunc(n) || 0;
		const {length} = this;
		if(n < 0) n += length;
		if(n < 0 || n >= length) return;
		return this[n];
	}
	const {prototype: TypedArray} = Object.getPrototypeOf(Uint8Array);
	for(const type of [Array.prototype, String.prototype, TypedArray])
		Object.defineProperty(type, "at", {configurable: true, writable: true, value: at});
}

// https://v8.dev/features/object-has-own
if("function" !== typeof Object.hasOwn){
	const {hasOwnProperty: hasOwn} = Object.prototype;
	Object.defineProperty(Object, "hasOwn", {
		configurable: true,
		writable: true,
		value: Object.prototype.hasOwnProperty.call.bind(hasOwn),
	});
}

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

const {
	prototype: fnProto,
} = Function;
const {toString: fnStr} = fnProto;
if("function" === typeof fnStr && {}.toString !== fnStr){
	const user = (function(){ return "FooBar123"; }).toString();
	let native = fnStr.call(Function.constructor);
	if(user !== native && user.includes("FooBar123") && !native.includes("FooBar123")){
		native = native.slice(native.indexOf("{"));
		Object.defineProperty(fnProto, "isNative", {
			get(){ return fnStr.call(this).endsWith(native); },
			configurable: true,
		});
	}
}

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


// DOM manipulation helpers
Object.defineProperties(Element.prototype, {
	unwrap(){
		const {childNodes, parentNode} = this;
		if(!parentNode) return this;
		this.after(...childNodes);
		this.remove();
		return parentNode;
	},
});

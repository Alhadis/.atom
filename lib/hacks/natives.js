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

// https://tc39.es/proposal-promise-with-resolvers
Promise.withResolvers ??= function(){
	let resolve, reject;
	const promise = new Promise((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return {promise, resolve, reject};
};

// https://tc39.es/proposal-array-grouping
Object.groupBy ??= function(items, callbackFn){
	const result = {__proto__: null};
	let index = 0;
	for(const item of items){
		const key = callbackFn(item, index++);
		(result[key] ??= []).push(item);
	}
	return result;
};
Map.groupBy ??= function(items, callbackFn){
	const result = new Map();
	let index = 0;
	for(const item of items){
		const key = callbackFn(item, index++);
		result.has(key)
			? result.get(key).push(item)
			: result.set(key, [item]);
	}
	return result;
};

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
	unwrap: {
		configurable: true,
		writable: true,
		value(){
			const {childNodes, parentNode} = this;
			if(!parentNode) return this;
			this.after(...childNodes);
			this.remove();
			return parentNode;
		},
	},
});


// ActionScript 3.0 nostalgia
Object.defineProperties(Array, {
	CASEINSENSITIVE:    {value: 1,  enumerable: true},
	DESCENDING:         {value: 2,  enumerable: true},
	UNIQUESORT:         {value: 4,  enumerable: true},
	RETURNINDEXEDARRAY: {value: 8,  enumerable: true},
	NUMERIC:            {value: 16, enumerable: true},
});


// Timezone helpers
Date.localISODate = localISODate;
Object.defineProperties(Date.prototype, {
	local: {
		configurable: true,
		enumerable:   true,
		get(){ return localISODate(this); },
	},
});

/**
 * Return an ISO 8601-formatted {@link Date} using local time.
 * @example localISODate(…) === "2024-08-03T04:39:15.415+10:00";
 * @param {Date} [date=new Date()]
 * @return {String}
 */
function localISODate(date = new Date()){
	const pad = (n, l = 2) => n.toString().padStart(l, "0");
	const tz  = off => {
		if(!off) return "Z";
		const sign = off < 0 ? "-" : "+";
		return sign + [
			pad(Math.floor(off / 60)),
			pad(off % 60),
		].join(":");
	};
	return [
		pad(date.getFullYear(), 4),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
	].join("-") + "T" + [
		pad(date.getHours()),
		pad(date.getMinutes()),
		pad(date.getSeconds()) + "." +
		pad(date.getMilliseconds(), 3),
	].join(":") + tz(-date.getTimezoneOffset());
}


// Make text easier to wrangle piecemeal
Object.defineProperties(String.prototype, {
	fields: {
		configurable: true,
		enumerable:   false,
		value: function* fields(sep = "\t"){
			yield* this.tok(sep);
		},
	},
	lines: {
		configurable: true,
		enumerable:   false,
		value: function* lines(sep = "\n", inclusive = false){
			yield* this.tok(sep, inclusive);
		},
	},
	tok: {
		configurable: true,
		enumerable:   false,
		value: function* strtok(sep = " ", inclusive = false){
			const {length} = this;
			const sepSize = sep.length ?? +(sep >= 0);
			let number = 0, prev = 0, next;
			if(!length) return;
			if(!sepSize) throw new TypeError("Token separator cannot be empty");
			do{
				next = this.indexOf(sep, prev);
				yield Object.defineProperty({number, offset: prev, text: -1 === next
					? this.slice(prev)
					: this.slice(prev, next + (inclusive ? sepSize : 0)),
				}, "toString", {value(){ return this.text; }});
				if(-1 === next) break;
				prev = next + sepSize, ++number;
			} while(next < length - sepSize && -1 !== next);
		},
	},
});

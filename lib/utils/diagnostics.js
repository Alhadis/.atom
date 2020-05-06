"use strict";

const prot = atom.emitter.constructor.prototype;
const emit = prot.emit;

module.exports = {
	countdown,
	traceEmissions,
};


/**
 * Return a {@link Promise} that resolves after a delay,
 * counting each second that passes.
 *
 * @example countdown(10).then(() => console.log("Happy new year!"));
 * @param {Number} [ticks=5] - Countdown duration in seconds
 * @return {Promise<void>}
 */
async function countdown(ticks = 5){
	return new Promise((resolve, reject) => {
		console.log(ticks--);
		const timer = setInterval(() => ticks <= 0
			? resolve(clearInterval(timer))
			: console.log(ticks--), 1000);
	});
}


/**
 * Toggle logging of event emissions in the dev-console.
 *
 * @param {Boolean} active - Whether to trace emissions or not
 * @param {Number} [duration=5] - Stop tracing after 𝑁 seconds
 * @param {Number} [delay=5] - Wait 𝑁 seconds before tracing
 * @return {Promise<void>}
 */
async function traceEmissions(active = emit === prot.emit, duration = 0, delay = 0){
	if(duration > 0) setTimeout(() => traceEmissions(false), duration);
	if(delay    > 0) await countdown(delay);
	if(active){
		console.groupCollapsed("Traced emissions");
		prot.emit = function(name, ...args){
			if("did-update-state" !== name){
				const trace = {context: this, arguments};
				Error.captureStackTrace(trace);
				console.dir({context: this, arguments, trace, [Symbol.toStringTag]: name});
			}
			emit.apply(this, arguments);
		};
	}
	else{
		console.groupEnd();
		prot.emit = emit;
	}
}

"use strict";

const {statSync} = require("fs");
const {loadFromCore} = require("./loaders.js");
const {$} = require("./other.js");

// Extract ImageView package's unexported UI classes
const ImageEditor     = loadFromCore("image-view/lib/image-editor");
const ImageEditorView = loadFromCore("image-view/lib/image-editor-view");

module.exports = {
	loadImage,
	playSound,
	say,
	scanBarcode,
};


/**
 * Asynchronously load an external image file.
 *
 * @example await loadImage("/tmp/qr.png");
 * @param {String} path
 * @return {Promise<HTMLImageElement>}
 * @public
 */
function loadImage(path){
	return new Promise((resolve, reject) => {
		const el   = document.createElement("img");
		el.onerror = event => reject(event);
		el.onload  = event => resolve(event.target);
		el.src     = path;
		return el;
	});
}


/**
 * Play an audio file.
 *
 * @example await playSound("/usr/share/notify.wav");
 * @param {String} path - Path to a supported media file
 * @param {Boolean} [wait=false] - Wait for playback to finish before resolving
 * @throws {Error} if argument isn't a regular file
 * @return {Promise<void>}
 * @public
 */
async function playSound(path, wait = false){
	if(!statSync(path).isFile())
		throw new Error(`No such file: ${path}`);
	const el = document.createElement("audio");
	const outcome = new Promise((resolve, reject) => {
		el.addEventListener("error", reject);
		el.addEventListener(wait ? "ended" : "canplay", () => resolve());
		el.src = path;
	});
	el.play();
	return outcome;
}


/**
 * Determine if an element is the root of an active {@link ImageEditor} component.
 * @param {HTMLElement} el
 * @return {Boolean}
 * @private
 */
function isImageViewRoot(el){
	return (
		el instanceof HTMLDivElement
		&& el.classList.contains("image-view")
		&& atom.workspace.getPaneItems().some(item =>
			ImageEditor === item.constructor && el === item.element)
	);
}


/**
 * Read a message out loud to the user.
 *
 * @example await say("G'day, world.");
 * @param {String} text
 * @return {Promise<void>}
 * @public
 */
async function say(text, voice = null){
	if(null == voice){
		if(null == voices)
			await getSupportedVoices();
		for(const locale of voices){
			if("en_au" === locale[0].toLowerCase()){
				[voice] = locale[1][0];
				break;
			}
		}
		voice ||= "en_AU";
	}
	if(text.includes("'"))
		text = text.replaceAll(/'/g, "'\\''");
	return $ `say -v ${voice} '${text}'`;
}


/**
 * Scan an image's barcode(s).
 *
 * @warning Black-coloured data against transparent backgrounds may cause issues.
 * @param {String|ImageBitmapSource|ImageEditor|ImageEditorView} src
 * @param {?String[]} formats
 * @return {Promise<DetectedBarcode[]>}
 * @public
 */
async function scanBarcode(src, formats){
	if("string" === typeof src)
		src = await loadImage(src);
	else{
		if(isImageViewRoot(src))           src = src.querySelector(".image-container img[src]");
		if(src instanceof ImageEditor)     src = src.editorView;
		if(src instanceof ImageEditorView) src = src.refs.image;
	}
	const scanner = new BarcodeDetector({formats});
	return scanner.detect(src);
}


/**
 * Regular expression to match voice description lines emitted by say(1).
 * @constant {RegExp} rVoiceSpec
 * @private
 */
const rVoiceSpec = new RegExp(String.raw `
	^\s*   (?<name>   \S+)
	\s{2,} (?<locale> [a-zA-Z]{2} (?:[-_]\S+)?)
	(?:
		\s+ # \s*
		(?<example> \S.*?)
	)? \s*$
`.trim().replace(/\s+/g, ""), "gm");


/**
 * Retrieve a list of system-installed voices if needed.
 * @return {Promise<Array>}
 * @private
 */
async function getSupportedVoices(){
	if(voicePromise) return voicePromise;
	return voicePromise = new Promise((resolve, reject) =>
		($ `say --voice ?`).then(output => {
			voices = new Map();
			const results = output.trim().matchAll(rVoiceSpec);
			for(const result of results){
				const {name, locale, example} = result.groups;
				voices.has(locale)
					? voices.get(locale).push([name, example])
					: voices.set(locale, [[name, example]]);
			}
			return resolve(voices);
		}).catch(error => reject(error)));
}
let voicePromise, voices;

"use strict";

/**
 * Return whether a character is used to delimit string data.
 *
 * @example isQuote('"') => true
 * @param {String} input
 * @return {Boolean}
 */
function isQuote(input){
	switch(input[0]){
		case '"':
		case "'":
			return true;
	}
	return false;
}

function getPrevQuote(input){
	return getNextQuote(input);
}

function getNextQuote(input){
	if('"' === input) return "'";
	if("'" === input) return '"';
	return "";
}

function swapQuotes(input, [A, B] = ['"', "'"]){
	const unquote = new RegExp(`(\\\\*)(${A}|${B})`, "g");
	return input.replace(unquote, (match, escaped, oldQuote) => {
		const updatedQuote = oldQuote === A ? B : A;
		if(escaped){
			return !!(escaped.length % 2)
				? escaped.replace(/\\$/, "") + updatedQuote
				: (escaped + updatedQuote);
		}
		else return updatedQuote;
	});
}


atom.commands.add("atom-text-editor", "user:swap-quotes", event => {
	const editor = atom.workspace.getActiveTextEditor();
	editor.mutateSelectedText(selection => {
		
		if(selection.isEmpty()){
			const {cursor} = selection;
			const {buffer} = selection.editor;
			const prevChar = getCharBefore(cursor);
			const nextChar = getCharAfter(cursor);
			if(isQuote(prevChar)) setCharBefore(cursor, getPrevQuote(prevChar));
			if(isQuote(nextChar)) setCharAfter(cursor,  getNextQuote(nextChar));
		}
		
		// Operate upon a selected ranges
		else{
			const text = selection.getText();
			const swapped = swapQuotes(text);
			if(swapped !== text)
				selection.insertText(swapped, {select: true});
		}
	});
});

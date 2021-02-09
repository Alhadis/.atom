"use strict";

const {toPoint, toRange} = require("../utils/buffer.js");
const {loadPromise: uniDataPromise} = require("../utils/ascii.js");

// Scope-names for tokenised tables (see: ~/.atom/packages/injections/grammars/0.cson)
const TBL_ROW = "meta.stt.table-row.js";
const TBL_COL = "meta.stt.table-column.js";
const CHARMAP = "meta.stt.charmap-table.js";
const STT     = "meta.stt.stt-table.js";
const ID_CHAR = "constant.other.stt-character-class.js";
const ID_STT  = "constant.other.stt-transition-id.js";

// Prepare some commonly-used CSS selectors for querying the table, sans ugly prefix
const [CHARMAP_COL, STT_COL] = [
	`.${CHARMAP} > .${TBL_ROW} > .${TBL_COL}`,
	`.${STT}     > .${TBL_ROW} > .${TBL_COL}`,
].map(s => s.replace(/\./g, ".syntax--"));

// Cursor `data-*` fields
const CHAR_INFO  = "char";
const CURR_STATE = "currentState";
const NEXT_STATE = "nextState";

atom.workspace.observeTextEditors(async editor => {
	await uniDataPromise;
	const {scopeName} = editor.getGrammar();
	if("source.js" === scopeName){
		editor.active || await new Promise(resolve => {
			const disposables = new CompositeDisposable(
				editor.onDidDestroy(() => disposables.dispose()),
				atom.workspace.onDidChangeActiveTextEditor(e =>
					e === editor && resolve(disposables.dispose())),
			);
		});
		
		// Locate the character map and truth table definitions
		const text = editor.getText();
		let stt = text.indexOf("\nconst STT = [/*═");
		let map = text.indexOf("\nconst charmap = [/*═");
		if(!~stt || !~map) return;
		stt = editor.markBufferRange([toPoint(++stt), toPoint(text.indexOf("\n", text.indexOf("╚", stt)))]);
		map = editor.markBufferRange([toPoint(++map), toPoint(text.indexOf("\n", text.indexOf("╚", map)))]);
		editor.stt = {main: stt, map}; // Expose for devtools
		
		editor.onDidStopChanging(changes => {
			
		});
		
		editor.onDidChangeCursorPosition(({cursor, newBufferPosition: pos}) => {
			if(!cursor.selection.isEmpty()) return;
			
			const index = editor.getCursorsOrderedByBufferPosition().indexOf(cursor);
			const caret = editor.element.querySelectorAll(".lines > .cursors > .cursor")[index];
			const line  = editor.element.querySelector(`.line[data-screen-row="${pos.row}"]`);
			if(!caret) return; // Shouldn't happen
			
			let charInfo, currState, nextState;
			const {dataset} = caret;
			
			// This *definitely* shouldn't happen…
			if(!(dataset && dataset instanceof DOMStringMap))
				return;
			
			// Cursor's located inside character-class table
			search: if(line && map.getBufferRange().containsPoint(pos)){
				const text = line.textContent.trim();
				const [hexDigit1] = text;
				
				// Ignore purely presentational rows
				if(Number.isNaN(parseInt(hexDigit1, 16)))
					break search;
				
				const cells = line.querySelectorAll(CHARMAP_COL);
				const cellIndex = editor.lineTokens(pos.row)
					.filter(token => token.length > 0 && token.scopes.includes(ID_CHAR))
					.findIndex(({range: [start, end]}) => pos.column >= start && pos.column <= end - 1);
				if(!~cellIndex) break search;
				const hexDigit2 = (cellIndex % 0x10).toString(16);
				const codePoint = parseInt(hexDigit1 + hexDigit2, 16);
				const codePointHex = codePoint.toString(16).padStart(4, "0").toUpperCase();
				
				let {isoName, name, unicode1Name} = global.ASCII[codePoint] || {};
				if(Array.isArray(isoName)){
					if((isoName[2] || "").startsWith("Uppercase ")
					|| (isoName[2] || "").startsWith("Lowercase "))
						isoName = isoName[2];
					else isoName = isoName.join("/");
				}
				
				charInfo  = `${String.fromCodePoint(codePoint)} (U+${codePointHex} `;
				charInfo += `${isoName || name || unicode1Name})`;
			}
			
			// Cursor's located inside state-transition table
			else if(line && stt.getBufferRange().containsPoint(pos)){
				
			}
			
			// Update `data-*` attributes
			null != charInfo  ? dataset[CHAR_INFO]  = charInfo  : delete dataset[CHAR_INFO];
			null != currState ? dataset[CURR_STATE] = currState : delete dataset[CURR_STATE];
			null != nextState ? dataset[NEXT_STATE] = nextState : delete dataset[NEXT_STATE];
		});
	}
});

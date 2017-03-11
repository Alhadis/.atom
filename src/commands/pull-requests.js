"use strict";

const {getGrammarAtCursor} = require("../utils/buffer.js");


/**
 * @function user:sponge-mode
 * @summary Reset editor-settings to comply with Atom's ugly code-style.
 */
atom.commands.add("atom-workspace", "user:sponge-mode", () => {
	for(const ed of atom.textEditors.editors){
		const text = ed.getText();
		if(/\t/.test(text)){
			const tabSize = ed.getTabLength();
			ed.setText(text.replace(/\t/g, " ".repeat(tabSize)));
		}
		ed.setTabLength(2);
		ed.setSoftTabs(true);
	}
});


/**
 * @function user:specsaver
 * @summary Generate specs when preparing PRs for Atom's grammar packages.
 */
atom.commands.add("atom-text-editor", "user:specsaver", () => {
	let keepWhiteSpace = false;
	let noCopy = false;
	let output;
	const grammar = getGrammarAtCursor();
	const editor = atom.workspace.getActiveTextEditor();
	const text = (editor.getSelectedText() || editor.getText())
		.replace(/\n+$/, "")
		.replace(/\t/g, "  ");
	
	// One line
	if(!/\n/.test(text)){
		output = "{tokens} = grammar.tokenizeLine('" + text.replace(/'/g, "\\'").replace(/\\/g, "\\\\") + "')\n";
		const {tokens} = grammar.tokenizeLine(text);
		tokens.forEach((token, index) => {
			let {value, scopes} = token;
			if(!keepWhiteSpace && /^\s+$/.test(value)) return;
			value   = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
			scopes  = "['" + scopes.join("', '") + "']";
			output += `expect(tokens[${index}]).toEqual value: '${value}', scopes: ${scopes}\n`;
		});
	}
	
	// Multiple lines
	else{
		output = 'lines = grammar.tokenizeLines """\n' + text.replace(/^/gm, "  ").replace(/\\/g, "\\\\") + '\n"""\n';
		const lines = grammar.tokenizeLines(text);
		lines.forEach((tokens, lineIndex) => {
			tokens.forEach((token, tokenIndex) => {
				let {value, scopes} = token;
				if(!keepWhiteSpace && /^\s+$/.test(value)) return;
				value   = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
				scopes  = "['" + scopes.join("', '") + "']";
				output += `expect(lines[${lineIndex}][${tokenIndex}]).toEqual value: '${value}', scopes: ${scopes}\n`;
			});
		});
	}
	
	if(noCopy) return output;
	atom.clipboard.write(output);
});

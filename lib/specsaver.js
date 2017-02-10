"use strict";

module.exports = {specsaver, getGrammarAtCursor};


/**
 * Generate specs when preparing PRs for Atom's grammar packages.
 *
 * @param {Boolean} keepWhiteSpace - Include whitespace-only tokens
 * @param {Boolean} noCopy - Don't copy the result to the clipboard
 * @return {String}
 */
function specsaver(keepWhiteSpace = false, noCopy = false){
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
}


/**
 * Identify grammar at cursor's position.
 *
 * @param {Cursor} cursor
 * @return {Grammar}
 */
function getGrammarAtCursor(cursor){
	const editor = atom.workspace.getActiveTextEditor();
	
	if(!cursor){
		if(!editor) return null;
		cursor = editor.getLastCursor();
	}
	
	// Construct a list of regular expressions to match each scope-name
	const patterns = [];
	const grammars = atom.grammars.grammarsByScopeName;
	for(let name in grammars){
		const grammar = grammars[name];
		const pattern = new RegExp("(?:^|[\\s.])" + name.replace(/\./g, "\\.") + "(?=$|[\\s.])");
		patterns.push([pattern, grammar]);
	}
	
	const scopes = cursor.getScopeDescriptor().scopes.reverse();
	for(let scope of scopes){
		
		// Corrections for embedded languages
		switch(scope){
			case "source.php":    return grammars["text.html.php"];
			case "text.html.php": return grammars["text.html.basic"];
		}
		
		const matchedGrammar = patterns.find(i => i[0].test(scope));
		if(matchedGrammar) return matchedGrammar[1];
	}
	
	return cursor.editor
		? cursor.editor.getGrammar()
		: editor.getGrammar();
}

"use strict";

const prot = atom.emitter.constructor.prototype;
const emit = prot.emit;
const emissions = Object.defineProperty([], "log", {
	get(){return this.map(e => e[0]).join("\n")}
});

/** Crude debugging method to see what events we can hook into */
function traceEmissions(active){
	prot.emit = !active ? emit : function(name){
		if("did-update-state" !== name){
			emissions.push(Array.from(arguments));
			console.trace(arguments);
		}
		emit.apply(this, arguments);
	};
}

/** Less verbose way to dispatch a command */
function dispatch(command, target = null){
	target = target || atom.views.getView(atom.workspace);
	return atom.commands.dispatch(target, command);
}

/**
 * Globalise some of Atom's essential APIs.
 */
function globaliseAtomAPIs(){
	if(global.CompositeDisposable) return;
	const {CompositeDisposable, Disposable, Emitter, Point, Range} = require("atom");
	global.CompositeDisposable = CompositeDisposable;
	global.Disposable = Disposable;
	global.Emitter = Emitter;
	global.Point = Point;
	global.Range = Range;
}

/** Update an editor's settings using those found in any embedded modelines */
function readModelines(editor){
	let text    = editor.getText();
	let tabStop = text.match(/(?:^|\s)vi(?:m[<=>]?\d+|m?):.*?[: ](?:ts|tabstop)\s*=(\d+)/i);
	if(tabStop){
		const {setTabLength} = editor.constructor.prototype;
		setTabLength.call(editor, +tabStop[1]);
	}
}

/** Return a reference to the active text-editor's root element in the Shadow DOM */
function getRootEditorElement(){
	let el = atom.workspace.getActiveTextEditor().getElement();
	return el ? el.shadowRoot.querySelector(".scroll-view") : null;
}


/**
 * Identify the grammar being used to highlight a cursor's position.
 *
 * @param {Cursor} cursor - Defaults to current editor's cursor
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



/**
 * Generate specs when preparing PRs for Atom's grammar packages.
 *
 * @param {Boolean} keepWhiteSpace - Include whitespace-only tokens
 * @param {Boolean} noCopy - Don't copy the result to the clipboard
 * @return {String}
 */
function specsaver(keepWhiteSpace = false, noCopy = false){
	let output;
	const editor   = atom.workspace.getActiveTextEditor();
	const grammar  = getGrammarAtCursor();
	const text     = (editor.getSelectedText() || editor.getText())
		.replace(/\n+$/, "")
		.replace(/\t/g, "  ")
	
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
 * Evaluate a string as CSS and display the computed CSSOM result.
 *
 * @param {String} text - Defaults to the current buffer/selection
 * @return {String}
 */
function evalCSS(text = null){
	if(!text){
		const editor = atom.workspace.getActiveTextEditor();
		text = editor.getSelectedText() || editor.getText();
	}
	
	const style = document.createElement("style");
	style.textContent = text;
	document.documentElement.appendChild(style);

	let detail = "";
	for(const rule of Array.from(style.sheet.cssRules))
		detail += rule.cssText + "\n";
	
	style.remove();
	atom.notifications.addInfo("CSSOM Rendition", {detail, dismissable: true});
	return detail;
}



/**
 * Generate a function to switch between two states each time it runs.
 *
 * @param {Function} a - Initial state
 * @param {Function} b - Alternate state
 * @return {Function}
 */
function Switch(a, b){
	let state = 0;
	a();
	return (...args) => ((state = !state)? b:a)(...args);
}


/**
 * Generate something to stuff multiple temporary/bullshit functions
 * into without polluting your keymap with garbage.
 *
 * Save scoped selectors for more serious shite.
 *
 * @param {Object} input
 * @return {Function}
 */
function ContextualCommand(input){
	input = Object.assign({}, input);
	
	return function(){
		const grammar = getGrammarAtCursor();
		if(!grammar) return;
		
		let cmd = input[grammar.scopeName];
		if("function" === typeof cmd)
			return cmd();
		
		if("string" === typeof cmd){
			let target;
			
			if(/\s/.test(cmd)){
				cmd    = cmd.split(/\s+/);
				target = cmd.shift();
				cmd    = cmd.join(" ");
			}
			
			target = target || atom.workspace.getActiveTextEditor().editorElement;
			return atom.commands.dispatch(target, cmd);
		}
	};
}


Object.assign(global, {
	inced: _=> require(ed.buffer.file.path),
	Electron: require("electron"),
	print: require("print"),
	
	Switch,
	getRootEditorElement,
	traceEmissions,
	readModelines,
	dispatch,
	emissions,
	specsaver,
	evalCSS,
	getGrammarAtCursor,
	ContextualCommand,
});

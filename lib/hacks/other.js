"use strict";

const {getGrammar, wait} = require("../utils/other.js");
const {OnigRegExp} = require("./grammars.js");

// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	if(!atom.config.get("user.enable-pending-items"))
		pane.setPendingItem(null);
	pane.focus();
});


// Collapse all project entries when alt+clicking an expanded tree-view entry
atom.packages.activatePackage("tree-view").then(({mainModule: {treeView}}) => {
	const {onMouseDown} = treeView;
	treeView.onMouseDown = function(event){
		const selector = "li[is='tree-view-directory'].project-root.expanded";
		let projectEntry;
		if(event.altKey && (projectEntry = event.target?.closest(selector))){
			for(const root of treeView.roots)
				root === projectEntry || root.collapse(true);
			event.preventDefault();
			event.stopPropagation();
		}
		else return onMouseDown.call(this, event);
	};
});


// Fix a hilarious typo in Atom's `git-diff` package that prevents renaming files
const GitDiffView = loadFromCore("../node_modules/git-diff/lib/git-diff-view.js");
Object.defineProperty(GitDiffView.prototype, "edtior", {
	get(){ return this.editor; },
	set(to){ this.editor = to; },
});


// Match brackets inside certain strings and comments
const BracketMatcher     = loadFromCore("bracket-matcher/lib/bracket-matcher");
const BracketMatcherView = loadFromCore("bracket-matcher/lib/bracket-matcher-view");
const {isCursorOnInterpolatedString} = BracketMatcher.prototype;
const {isScopeCommentedOrString} = BracketMatcherView.prototype;
BracketMatcher.prototype.isCursorOnInterpolatedString = function(...args){
	if((this.editor.getPath() || "").endsWith(".cson")) return false;
	return isCursorOnInterpolatedString.call(this, ...args);
};
BracketMatcherView.prototype.isScopeCommentedOrString = function(...args){
	if(args[0].some(scopeList => /^comment.block.ignored-input/.test(scopeList))
	|| args[0].some(scopeList => /^string\.quoted.*?\.coffee$/.test(scopeList))
	|| args[0].some(scopeList => /^string\.interpolated\.make/.test(scopeList))
	|| args[0].some(scopeList => /^string\b.*?\.regexp(?:$|\.)/.test(scopeList)
	&& args[0].some(scopeList => scopeList.split(".").includes("string"))))
		return false;
	return isScopeCommentedOrString.call(this, ...args);
};


// Increase token limit
getGrammar("source.js").then(js => js.maxTokensPerLine = 500);

// WikiText blobs can be freakin' HUGE, so give copy+pasted articles ample tokenisation limits
getGrammar("text.html.mediawiki").then(wiki => {
	wiki.maxTokensPerLine = 5000;
	wiki.maxLineLength    = 90000;
});


// Default to plain-text when creating a new file
atom.commands.onDidDispatch(({type}) => {
	if("application:new-file" !== type) return;
	atom.workspace.emitter.once("did-stop-changing-active-pane-item", editor => {
		editor && atom.grammars.nullGrammar === editor.getGrammar();
			editor.setGrammar(atom.grammars.grammarForScopeName("text.plain"));
	});
});


// Define custom filetypes without upsetting File Icons
const customTypes = {
	"source.js":    ["cjs", "jsx"],
	"source.json":  ["css.map", "js.map", "mjs.map", "nycrc", "c8rc", "hintrc", "ecrc"],
	"source.plist": ["glyphs"],
};
for(const scope in customTypes)
	wait(100).then(() => getGrammar(scope)).then(grammar => customTypes[scope].map(ext => {
		if(!grammar || !grammar.fileTypes) return;
		grammar.fileTypes.push(ext);
		for(const ed of atom.textEditors.editors)
			(ed.getFileName() || "").endsWith("." + ext) && ed.setGrammar(grammar);
	}));


// Fix idiotic and/or conflicting filetype associations
const fixGrammars = {
	"source.shell": ["install"],
	"source.erlang.config": ["app", "config"],
	"text.generic-config": [".config/git/ignore", ".git/info/exclude", "gitattributes", "gitignore", "hgignore", "stylelintignore"],
	"text.html.basic": ["kit", "tmpl", "tpl"],
	"text.html.php": ["install", "profile", "module", "inc"],
	"text.xml": ["svg"],
};
for(const scope in fixGrammars)
	wait(100).then(() => getGrammar(scope)).then(grammar => {
		grammar.fileTypes = grammar.fileTypes.filter(type => {
			return !fixGrammars[scope].includes(type);
		});
	});


// Add modeline support to grammars that lack a `firstLineMatch` field
const modeNames = {
	"source.css.less": {emacs: "less-css", vim: "less"},
	"source.css.scss": "scss",
	"source.css.sass": "sass",
	"source.go":       "go",
	"source.rust":     "rust",
	"source.ts":       "typescript",
};
for(const scope in modeNames){
	let modes = modeNames[scope];
	if("string" === typeof modes)
		modes = {emacs: modes, vim: modes};
	if("string" === typeof modes.emacs) modes.emacs = modes.emacs.trim().split(/\s+/);
	if("string" === typeof modes.vim)   modes.vim   = modes.vim  .trim().split(/\s+/);
	modes.emacs = modes.emacs.filter(Boolean);
	modes.vim   = modes.vim  .filter(Boolean);
	wait(100).then(() => getGrammar(scope)).then(grammar => {
		let matchModes = String.raw `(?x-im:
			-\*-(?:[ \t]*(?=[^:;\s]+[ \t]*-\*-)|(?:.*?[ \t;]|(?<=-\*-))[ \t]*(?i:mode)[ \t]*:[ \t]*)
				(?:${modes.emacs.join("|")})
			(?=[ \t;]|(?<![-*])-\*-).*?-\*-
			|
			(?:(?:^|[ \t])(?:vi|Vi(?=m))(?:m[<=>]?[0-9]+|m)?|[ \t]ex)(?=:(?=[ \t]*set?[ \t][^\r\n:]+:)|:(?![ \t]*set?[ \t]))
			(?:(?:[ \t]*:[ \t]*|[ \t])\w*(?:[ \t]*=(?:[^\\\s]|\\.)*)?)*[ \t:]
			(?:filetype|ft|syntax)[ \t]*=
				(?:${modes.vim.join("|")})
			(?=$|\s|:)
		)`;
		if(grammar.firstLineRegex){
			if(modes.emacs.some(mode => grammar.firstLineRegex.testSync(mode))
			|| modes.vim  .some(mode => grammar.firstLineRegex.testSync(mode)))
				return;
			matchModes = grammar.firstLineRegex.source + "|" + matchModes;
		}
		grammar.firstLineRegex = new OnigRegExp(matchModes);
	});
}


// Wipe junk <template/> elements added to <body> after a notification
atom.notifications.onDidAddNotification(note => {
	for(const el of document.querySelectorAll("body > template"))
		document.body.removeChild(el);
});


// Exclude subdirectories in ~/.atom/packages which *aren't* packages…
const PackageList = loadFromCore("settings-view/lib/list.js");
const {setItems} = PackageList.prototype;
PackageList.prototype.setItems = function(items){
	items = items.filter(item => "patches" !== item.name);
	return setItems.call(this, items);
};


// Force Java to be listed after JavaScript in the grammar-selector
getGrammar("source.java").then(java => java.name = `\x7F${java.name}`);


// Fix highlighting of unsupported filetypes
atom.workspace.observeTextEditors(ed => {
	const scope = {
		cjs: "source.js",
		ts:  "source.ts",
		tsx: "source.tsx",
	}[(ed.getFileName() || "").split(".").pop()];
	const grammar = atom.grammars.grammarForId(scope);
	grammar && ed.setGrammar(grammar);
});


// Fix incorrectly-detected filetypes
atom.workspace.observeTextEditors(ed => {
	const filename = ed.getFileName();
	
	// Force `.npmrc` files to use proper grammar instead of INI
	if(/^\.?npmrc$/i.test(filename))
		ed.grammar = "source.ini.npmrc";
	
	// ESLint used to support an extensionless config format that auto-detected JSON/YAML
	else if(/^\.?eslintrc$/i.test(filename) && "{" === ed.getTextInBufferRange([[0, 0], [0, 1]]))
		ed.grammar = "source.json";
});


// Insert “signature” before saving SyON files
atom.workspace.observeTextEditors(ed => {
	ed.buffer.onWillSave(() => {
		const a = 0xAD === ed.buffer.getCharacterAtPosition([0, 0]).charCodeAt(0);
		const b = 0xAD === ed.buffer.getCharacterAtPosition([0, 1]).charCodeAt(0);
		/\.sy$/i.test(ed.getFileName())
			? (a && b || ed.buffer.insert([0, 0], "\xAD\xAD"))
			: (a && b && ed.buffer.setText(ed.buffer.getText().replace(/^\xAD\xAD/, "")));
	});
});


// Tidy config to reduce diff-noise
const stringLists = [
	"core.disabledPackages",
	"markdown-preview.grammars",
	"spell-check.grammars",
];
for(const key of stringLists){
	const currentValue = atom.config.get(key);
	const sortedValue = [...new Set(currentValue)].sort();
	if(currentValue.join("\n") !== sortedValue.join("\n"))
		atom.config.set(key, sortedValue);
}

// Delete settings which aren't meant to linger around
atom.config.set("spell-check.grammars", []);
atom.config.unset("linter-ui-default");
const ephemeralKeys = ["user:enable-pending-items"];
for(const keyPath of ephemeralKeys){
	if(undefined !== atom.config.getRawValue(keyPath))
		atom.config.unset(keyPath);
}


// Fix TypeError thrown when reloading window
for(const key of atom.blobStore.inMemoryBlobs.keys())
	if(atom.blobStore.usedKeys.has(key) && !atom.blobStore.getFromMemory(key))
		atom.blobStore.delete(key);


// Augment `link:open` to grok RFCs and JSDoc {@link}.
atom.packages.activatePackage("link").then(({mainModule: pkg}) => {
	const {linkAtPosition} = pkg;
	pkg.linkAtPosition = function(editor, position){
		const token = editor.tokenAt(position);
		if(/^RFC\s*(\d+)$/i.test(token.value)){
			const rfc  = "rfc" + RegExp.$1;
			const text = editor.buffer.lineForRow(position.row).substr(token.range[1]);
			const sect = (text.match(/^\s*§\s*(\d+(?:\.\d+)?)/) || [, ""])[1];
			return `https://tools.ietf.org/html/${rfc}${sect ? "#section-" + sect : ""}`;
		}
		else if(token.scopes.includes("variable.other.link.underline.jsdoc"))
			return token.value;
		return linkAtPosition.call(this, editor, position);
	};
});


// Stop keybinding-resolver from stealing focus
let lastEditor = null;
atom.commands.onWillDispatch(event => {
	if("key-binding-resolver:toggle" === event.type){
		const item = atom.workspace.getActivePaneItem();
		if(atom.workspace.isTextEditor(item)){
			lastEditor = atom.workspace.getActiveTextEditor();
			atom.workspace.emitter.once("did-stop-changing-active-pane-item", item => {
				if(lastEditor && item && "KeyBindingResolverView" === item.constructor.name){
					const pane = atom.workspace.paneForItem(lastEditor);
					pane.activate();
					pane.activateItem(lastEditor);
					lastEditor = null;
				}
			});
		}
		else lastEditor = null;
	}
});


// Re-examine the grammars of each editor that's open at startup
wait(500).then(() => {
	for(const buffer of new Set([...atom.textEditors.editors].map(ed => ed.buffer)))
		atom.grammars.autoAssignLanguageMode(buffer);
});

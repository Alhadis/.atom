"use strict";

// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	if(!atom.config.get("user.enable-pending-items"))
		pane.setPendingItem(null);
	pane.focus();
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
loadGrammar("source.js").then(js => js.maxTokensPerLine = 500);


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
	"source.json":  ["css.map", "js.map", "mjs.map", "nycrc", "c8rc", "hintrc"],
	"source.plist": ["glyphs"],
};
for(const scope in customTypes)
	loadGrammar(scope).then(grammar => customTypes[scope].map(ext => {
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
	"text.html.php": ["install", "profile", "module", "inc"],
	"text.xml": ["svg"],
};
for(const scope in fixGrammars)
	loadGrammar(scope).then(grammar => {
		grammar.fileTypes = grammar.fileTypes.filter(type => {
			return !fixGrammars[scope].includes(type);
		});
	});


// Wipe junk <template/> elements added to <body> after a notification
atom.notifications.onDidAddNotification(note => {
	for(const el of document.querySelectorAll("body > template"))
		document.body.removeChild(el);
});


// Remind grammar-selector I don't give a fuck about tree-shitter
const {getGrammars} = atom.grammars;
atom.grammars.getGrammars = function(params){
	const includeTreeSitter = document.body.classList.contains("shitting-trees");
	return getGrammars.call(this, {...params, includeTreeSitter});
};
atom.config.observe("core.useTreeSitterParsers", value => {
	document.body.classList.toggle("shitting-trees", value);
	atom.config.set("grammar-selector.hideDuplicateTextMateGrammars", !value);
});


// Exclude subdirectories in ~/.atom/packages which *aren't* packages…
const PackageList = loadFromCore("settings-view/lib/list.js");
const {setItems} = PackageList.prototype;
PackageList.prototype.setItems = function(items){
	items = items.filter(item => "patches" !== item.name);
	return setItems.call(this, items);
};


// Force Java to be listed after JavaScript in the grammar-selector
loadGrammar("source.java").then(java => java.name = `\x7F${java.name}`);


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


// Force `.npmrc` files to use proper grammar instead of INI
atom.workspace.observeTextEditors(ed => {
	if(/^\.?npmrc$/i.test(ed.getFileName()))
		ed.setGrammar(atom.grammars.grammarForId("source.ini.npmrc"));
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

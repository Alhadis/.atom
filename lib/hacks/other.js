"use strict";

// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	if(!atom.config.get("user.enable-pending-items"))
		pane.setPendingItem(null);
	pane.focus();
});


// Increase token limit
loadGrammar("source.js").then(js => js.maxTokensPerLine = 500);


// Fix idiotic filetype associations
const fixGrammars = {
	"source.shell": ["install"],
	"text.html.php": ["install", "profile", "module", "inc"],
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
const ephemeralKeys = ["user:enable-pending-items"];
for(const keyPath of ephemeralKeys){
	if(undefined !== atom.config.getRawValue(keyPath))
		atom.config.unset(keyPath);
}

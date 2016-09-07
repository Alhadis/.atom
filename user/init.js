
/** Crude debugging method to see what events we can hook into */
const prot = atom.emitter.constructor.prototype;
const emit = prot.emit;
global.traceEmissions = function(active){
	if(active)
		prot.emit = function(name){
			if("did-update-state" !== name){
				emissions.push(Array.from(arguments));
				console.trace(arguments);
			}
			emit.apply(this, arguments);
		}
	else prot.emit = emit;
};

global.emissions = Object.defineProperty([], "log", {
	get(){ return this.map(e => e[0]).join("\n"); }
});


/** Disable that useless pending item feature */
atom.workspace.onDidAddPaneItem(({pane}) => pane.setPendingItem(null))


/** Create a global reference to the File-Icons package */
if(global.fi = atom.packages.loadedPackages["file-icons"]){
	global.FI_PATH = fi.path;
	global.fi      = fi.mainModule;
}


/** Debugging commands for developing the aforementioned package */
function makeSetting(name, config){
	atom.commands.add("body", `file-icons:toggle-${name}`, function(){
		atom.config.set(config, !(atom.config.get(config)));
	});
}

makeSetting("changed-only", "file-icons.onChanges");
makeSetting("tab-icons", "file-icons.tabPaneIcon");

atom.commands.add("body", "file-icons:open-settings", function(){
	atom.workspace.open("atom://config/packages/file-icons");
});


/** Undo whitespace molestation applied by Project-Manager */
const {exec} = require("child_process");
exec(`cd ${__dirname}/.. && make could-you-not`);


/** Command to run GNU Make from project directory */
atom.commands.add("atom-workspace", "user:make", function(){
	const projectPath = atom.project.getPaths();
	exec(`cd '${projectPath[0]}' && make`);
});


/** Clear .DS_Store junk from desktop when saving files */
atom.workspace.observeTextEditors(editor => {
	editor.onDidSave(function(){
		setTimeout(_=> exec("~/.files/bin/dsclean ~/Desktop"), 50);
	});
});


/** Return a reference to the active text-editor's root element in the Shadow DOM */
function getRootEditorElement(){
	let el = atom.workspace.getActiveTextEditor().getElement();
	return el ? el.shadowRoot.querySelector(".scroll-view") : null;
}

/** Register command to toggle bracket-matcher */
atom.commands.add("body", "user:toggle-bracket-matcher", function(){
	let el = getRootEditorElement();
	el && el.classList.toggle("show-bracket-matcher");
})

/** Command to reset editor's size to my preferred default, not Atom's */
atom.commands.add("atom-workspace", "user:reset-font-size", function(){
	atom.config.set("editor.fontSize", 11);
});


/** HACK: Register command to toggle faded tokens */
atom.commands.add("atom-workspace", "user:toggle-faded-tokens", function(){
	let el = getRootEditorElement();
	el && el.classList.toggle("show-faded-tokens");
});



/** Retrieve the contents of the current editor */
Object.defineProperty(global, "text", {
	get(){  return atom.workspace.getActiveTextEditor().buffer.getText(); },
	set(i){ atom.workspace.getActiveTextEditor().buffer.setText(i); }
});

/** Access the currently active editor */
Object.defineProperty(global, "ed", {
	get(){ return atom.workspace.getActiveTextEditor(); }
});

/** "Trendy Faggot" mode */
let trendy = atom.config.get("core.themes").includes("seti-ui");
Object.defineProperty(global, "trendy", {
	get(){ return trendy },
	set(i){
		if(i === trendy) return;
		atom.themes.onDidChangeActiveThemes(_=> atom.reload());
		
		if(trendy = i){
			atom.packages.enablePackage("autocomplete-plus");
			atom.config.set("minimap.autoToggle", true);
			atom.config.set("core.themes", ["seti-ui", "seti-syntax"]);
			atom.config.set("file-icons.coloured", true);
		}
		else{
			atom.packages.disablePackage("autocomplete-plus");
			atom.config.set("minimap.autoToggle", false);
			atom.config.set("core.themes", ["atom-light-ui", "Phoenix-Syntax"]);
			atom.config.set("file-icons.coloured", false);
		}
	}
});

global.__fileIconsDebugFilter = /Adding grammar/;
global.fip = atom.packages.loadedPackages["file-icons"].path + "/";
global.icons = require(fip + "lib/service/icon-service");


global.print = require("print");

global.hap = (...names) => {
	const tv = atom.packages.activePackages["tree-view"].mainModule;
	for(let name of names){
		name = name.split(/\s+/);
		for(let i of name)
			tv.treeView.emitter.on(i, args => console.log(args));
	}
};
atom.packages.onDidActivateInitialPackages(function(){
	hap("directory-created file-created entry-moved entry-copied entry-deleted");
});

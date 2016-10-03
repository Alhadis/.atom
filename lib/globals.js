"use strict";

let trendy = atom.config.get("core.themes").includes("seti-ui");

Object.defineProperties(global, {
	
	/** Contents of the current editor */
	text: {
		get(){  return this.ed.buffer.getText(); },
		set(i){ this.ed.buffer.setText(i); }
	},
	
	
	/** Currently active editor */
	ed: {
		get(){ return atom.workspace.getActiveTextEditor() }
	},
	
	
	/** Currently active pane */
	pane: {
		get(){ return atom.workspace.getActivePane() }
	},
	
	
	/** "Trendy Faggot" mode */
	trendy: {
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
	}
	
});


/** Reference to the File-Icons package */
if(global.fi = atom.packages.loadedPackages["file-icons"]){
	global.fi = fi.mainModule;
	global.FI_PATH = fi.path;
}

try{
	global.__fileIconsDebugFilter = /Adding grammar/;
	global.fip = atom.packages.loadedPackages["file-icons"].path + "/";
	global.icons = require(fip + "lib/service/icon-service");
} catch(e){}

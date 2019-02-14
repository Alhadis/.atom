"use strict";

const {fileExists, waitToLoad} = require("../utils/other.js");
const {existsSync, writeFileSync, realpathSync} = require("fs");
const {exec, which} = require("alhadis.utils");

// File Icons: Recompile config.cson on save
waitToLoad("file-icons").then(async pkg => {
	const nodePath = await which("node");
	const fileExists = path => existsSync(path)
		? (_FileIcons.debug && console.log(`${path} exists`), true)
		: (_FileIcons.debug && console.error(`${path} does NOT exist`), false);
	
	atom.workspace.observeTextEditors(editor => {
		let outputPath, recompiler, configPath, openedPath;
		if("config.cson" === editor.getFileName()
		&& fileExists(outputPath = pkg.path + "/lib/icons/.icondb.js")
		&& fileExists(recompiler = pkg.path + "/bin/compile")
		&& fileExists(configPath = pkg.path + "/config.cson")
		&& fileExists(openedPath = editor.getPath())
		&& realpathSync(configPath) === realpathSync(openedPath))
			editor.onDidSave(async () => {
				const result = await exec(nodePath, [recompiler], editor.getText());
				if(!result.code && result.stdout){
					writeFileSync(outputPath, result.stdout);
					for(const repo of atom.project.repositories)
						repo && repo.projectAtRoot && repo.refreshStatus();
				}
			});
	});
});

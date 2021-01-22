"use strict";

const fs      = require("fs");
const Atom    = require("atom");
const {spawn} = require("child_process");

const {loadFromCore} = require("../../lib/utils/loaders.js");
const {waitToLoad}   = require("../../lib/utils/other.js");
const {debounce}     = loadFromCore("lodash");
const {sync: which}  = loadFromCore("which");


// Toggle bounding-boxes of visible file-icons
atom.commands.add("atom-workspace", "file-icons:show-outlines", () =>
	document.body.classList.toggle("file-icons-show-outlines"));

// Make `icons.tsv` nicer to edit
watchStyleSheet(`${__dirname}/style.css`);

waitToLoad("file-icons").then(pkg => {
	
	// Recompile `config.cson` on save
	let nodePath = "";
	atom.whenShellEnvironmentLoaded(() => nodePath = which("node").trim());
	atom.workspace.observeTextEditors(editor => {
		let outputPath, recompiler, configPath, openedPath;
		if("config.cson" === editor.getFileName()
		&& fs.existsSync(outputPath = pkg.path + "/lib/icons/.icondb.js")
		&& fs.existsSync(recompiler = pkg.path + "/bin/compile")
		&& fs.existsSync(configPath = pkg.path + "/config.cson")
		&& fs.existsSync(openedPath = editor.getPath())
		&& fs.realpathSync(configPath) === fs.realpathSync(openedPath))
			editor.onDidSave(async result => {
				try{
					let stdout = "";
					const process = spawn(nodePath, [recompiler]);
					process.stdin.on("data", chunk => stdout += chunk);
					process.stdin.write(editor.getText());
					process.stdin.end();
					await new Promise(done => process.on("close", done));
					if(stdout){
						fs.writeFileSync(outputPath, stdout);
						for(const repo of atom.project.repositories)
							repo && repo.projectAtRoot && repo.refreshStatus();
					}
				} finally{}
			});
	});
	
	// Reload fonts when changes are detected
	for(const [uri, spec] of buildFontMap()){
		const path = uri.replace(/^atom:\/\//i, atom.configDirPath + "/packages/");
		watch(path, () => {
			++spec.rev;
			for(const rule of spec.rules){
				const {src} = rule.style;
				const index = src.lastIndexOf("/") + 1;
				rule.style.src = src.slice(0, index) + "/".repeat(spec.rev) + src.slice(index);
			}
		}, false);
	}
});


function buildFontMap(){
	const fonts = new Map();
	for(const sheet of document.styleSheets)
	for(const rule of sheet.cssRules || []){
		if(rule instanceof CSSFontFaceRule){
			const {src} = rule.style;
			if(src.startsWith('url("atom://')){
				let key = src.replace(/(?:\s+format\((?:"[^"]*"|'[^']*'|[^\)]*)\))+\s*$/i, "").slice(5, -2);
				if(key.indexOf("//" > 5)){
					key = key.replace(/(?<!^atom:)\/{2,}/g, "/");
					rule.style.src = `url("${key}")`;
				}
				fonts.has(key)
					? fonts.get(key).rules.add(rule)
					: fonts.set(key, {rev: 0, rules: new Set([rule])});
			}
		}
	}
	return fonts;
}

function watch(target, fn, preempt = true, delay = 10){
	preempt && fn(target);
	const symlink = fs.lstatSync(target).isSymbolicLink();
	target = fs.realpathSync(target);
	target = fs.statSync(target).isDirectory()
		? new Atom.Directory(target)
		: new Atom.File(target, symlink);
	target.onDidChange(debounce(() => fn(target.getPath()), delay));
	return target;
}

function watchStyleSheet(source){
	const el = document.createElement("style");
	let text = el.appendChild(document.createTextNode(""));
	watch(source, () => {
		if(fs.existsSync(source)){
			const fileData = fs.readFileSync(source, "utf8");
			
			// Minimise footprint as much as possible
			if(el.contains(text))
				text.nodeValue = fileData;
			else{
				el.textContent = fileData;
				text = el.childNodes[0];
			}
		}
	});
	Object.assign(el.dataset, {source, revision: ""});
	document.head.appendChild(el);
	return el;
}

"use strict";

const fs     = require("fs");
const {join, resolve, basename} = require("path");
const isDir  = x => fs.existsSync(x) && fs.statSync(x).isDirectory();


atom.commands.add("atom-workspace", "user:update-snapshots", updateOpenProjects);
atom.commands.add("atom-text-editor", "user:snapshot-scopes", async () => {
	const output = snapshot(atom.workspace.getActiveTextEditor());
	const editor = await atom.workspace.open();
	editor.setGrammar(atom.grammars.grammarForScopeName("source.json"));
	editor.setText(output);
});


/**
 * Tokenise a string.
 *
 * @param {String|TextEditor} input - Source to tokenise.
 * @param {String} filePath - Absolute path to input file
 * @return {TokenisedBuffer}
 * @internal
 */
function tokenise(...args){
	let input, filePath, grammar;
	if(args.length >= 1 && "string" === typeof args[0]){
		[input, filePath = null] = args;
		grammar = atom.grammars.selectGrammar(filePath, input);
	}
	else{
		const editor = atom.workspace.isTextEditor(args[0]) ? args[0] : atom.workspace.getActiveTextEditor();
		input   = editor.getSelectedText() || editor.getText();
		grammar = atom.grammars.grammarForId(editor.getRootScopeDescriptor().scopes[0]);
	}
	return grammar.tokenizeLines(input);
}


/**
 * Generate a JSON-encoded representation of a tokenised buffer.
 *
 * @example stringify(tokenise("…"));
 * @param {TokenisedBuffer} lines - List of tokenised lines.
 * @return {String}
 * @internal
 */
function stringify(lines){
	let result = "[";
	const {length} = lines;
	for(let i = 0; i < length; ++i){
		result += "[\n";
		for(const token of lines[i]){
			const value  = JSON.stringify(token.value);
			const scopes = token.scopes.map(name => JSON.stringify(name)).join(", ");
			result += `[${value}, ${scopes}],\n`;
		}
		result = result.replace(/,\n$/, "\n") + "],";
	}
	result = result.replace(/,$/, "") + "]\n";
	return result;
}


/**
 * Tokenise and stringify an editor or string.
 * @return {String}
 */
function snapshot(...args){
	return stringify(tokenise(...args));
}


/**
 * Update all projects currently open in the workspace.
 * @return {void}
 */
function updateOpenProjects(){
	const results = [];
	for(const project of atom.project.getPaths()){
		const result = updateProjectFixtures(project);
		result && results.push(result);
	}
	
	if(!results.length){
		const message = "No projects with fixture directories found.";
		atom.notifications.addError(message, {dismissable: true});
		return;
	}
	
	for(const result of results)
		atom.notifications.addInfo("Finished updating snapshots.", {
			dismissable: true,
			description: "created modified unchanged".split(" ").map(key => {
				const list = result[key];
				if(list && list.length){
					const plural = list.length !== 1 ? "s" : "";
					return `**${list.length} file${plural} ${key}:**\n\n<pre style="margin:.5em 0 1em">\n`
						+ list.map(path => tildify(path)).join("\n")
						+ "\n</pre>\n\n";
				}
			}).filter(Boolean).join("\n"),
		});
}


/**
 * Update the snapshot fixtures of a project.
 * @example updateProjectFixtures("/Users/john/.atom/packages/language-apl");
 * @param {String} projectPath - Path to project's base directory
 * @return {?UpdateSummary}
 */
function updateProjectFixtures(project){
	project          = resolve(project);
	const specsPath  = join(project, isDir(join(project, "test")) ? "test" : "spec");
	const inputPath  = join(specsPath, "fixtures", "input");
	const outputPath = join(specsPath, "fixtures", "output");
	return isDir(inputPath) && isDir(outputPath)
		? updateScopes(inputPath, outputPath)
		: null;
}


/**
 * Create or update saved snapshot fixtures.
 * @param {String} inputPath
 * @param {String} [outputPath=null]
 * @return {UpdateSummary}
 */
function updateScopes(inputPath, outputPath = null){
	const created   = [];
	const modified  = [];
	const unchanged = [];
	const filePaths = Object.create(null);
	const getFiles = path => fs.readdirSync(path).map(name =>
		filePaths[name] = join(path, name));
	
	inputPath  = resolve(inputPath);
	outputPath = resolve(outputPath || inputPath);
	inputPath === outputPath || getFiles(outputPath);
	
	for(const inputFile of getFiles(inputPath)){
		const input    = fs.readFileSync(inputFile, "utf8");
		const output   = snapshot(input, inputFile);
		let outputFile = basename(inputFile) + ".json";
		if(!filePaths[outputFile])
			created.push(outputFile = join(outputPath, outputFile));
		else{
			outputFile = filePaths[outputFile];
			if(output === fs.readFileSync(outputFile, "utf8")){
				unchanged.push(outputFile);
				continue;
			}
			modified.push(outputFile);
		}
		console.log({outputFile, inputPath, outputPath});
		fs.writeFileSync(outputFile, output, "utf8");
	}
	return {inputPath, outputPath, created, modified, unchanged};
}


/**
 * Replace any occurrences of `$HOME` with a tilde.
 *
 * @example tildify("/Users/johngardner/Labs/Utils") == "~/Labs/Utils"
 * @version Alhadis/Utils@1021920
 * @param {String} input
 * @return {String}
 */
function tildify(input){
	if("win32" === process.platform)
		return input;
	const home = process.env.HOME + "/";
	return (0 === input.indexOf(home))
		? input.substr(home.length).replace(/^\/?/, "~/")
		: input;
}


/**
 * @typedef  {Object}   UpdateSummary
 * @property {String[]} created    - Files that were created
 * @property {String[]} modified   - Files which needed updating
 * @property {String[]} unchanged  - Files which didn't need changing
 * @property {String}   inputPath  - Path of input directory
 * @property {String}   outputPath - Path of output directory
 */

/**
 * @typedef  {Object}   Token
 * @property {String}   value
 * @property {String[]} scopes
 */

/** @typedef {Token[]}     TokenList */
/** @typedef {TokenList[]} TokenLists */

/**
 * Array returned by {@link Grammar.prototype.tokenizeLines}.
 * @typedef {TokenList[]} TokenisedBuffer
 */

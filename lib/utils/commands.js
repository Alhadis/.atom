"use strict";

const {hasSelectedText, wrap, mutate} = require("./buffer.js");
const {getEditor, prompt, summarise} =


module.exports = {
	
	/**
	 * Resolve the {@link TextEditor} associated with an event.
	 * 
	 * @param {CustomEvent} event
	 * @return {TextEditor}
	 * @internal
	 */
	getEditor(event){
		return event && event.currentTarget
			? event.currentTarget.getModel()
			: atom.workspace.getActiveTextEditor();
	},
	
	
	/**
	 * Generate a handler for inserting a character.
	 *
	 * An auto-closing pair can be specified by returning an array of strings.
	 * 
	 * @param {String} char
	 * @param {Function} handler
	 * @return {Function}
	 */
	key(char, handler){
		return function(event){
			const editor = getEditor(event);
			if(!editor) return;
			let nativeInsert = false;
			const selections = editor.getSelectionsOrderedByBufferPosition();
			for(const selection of selections){
				const range  = selection.getBufferRange();
				const empty  = selection.isEmpty();
				const before = [[range.start.row, 0], range.start];
				const after  = [range.end, editor.buffer.rangeForRow(range.end.row).end];
				const result = handler.call(this, {
					count: selections.length,
					editor, selection, range, empty, event,
					textBefore: editor.buffer.getTextInRange(before),
					textAfter:  editor.buffer.getTextInRange(after),
				});
				if(result){
					const before = result[0] || "";
					const after  = result[1] || "";
					wrap(before, after, selection);
				}
				else if(!nativeInsert){
					editor.insertText(char);
					nativeInsert = true;
				}
			}
		};
	},
	
	
	/**
	 * Filter selected text using an external command.
	 *
	 * @example pipe("tr a-z A-Z") => ["INPUT"];
	 * @param {String} cmd
	 * @param {TextEditor} [editor]
	 * @return {Promise<String[]>}
	 */
	async pipe(cmd, editor = atom.workspace.getActiveTextEditor()){
		cmd = String(cmd || "").trim().replace(/^\$\s+/, "");
		
		// Sanity check
		if(!cmd) return;
		
		// No editor? No problem.
		if(!atom.workspace.isTextEditor(editor)){
			const {promisify} = require("util");
			const exec = promisify(require("child_process").exec);
			return summarise(await exec(cmd));
		}
		
		const cwd = require("path").dirname(editor.getPath() || "");
		const {spawn} = require("child_process");
		const ckpoint = editor.createCheckpoint();
		return Promise.all(editor.getSelections().map(selection => {
			const process = spawn("sh", ["-c", cmd], {cwd});
			const selOpts = {select: true};
			if(!selection.isEmpty())
				process.stdin.write(selection.getText());
			else selOpts.select = false;
			process.stdin.end();
			let stdout = "";
			let stderr = "";
			process.stderr.on("data", chunk => stderr += chunk);
			process.stdout.on("data", chunk => {
				if(selection.marker.isDestroyed())
					return process.kill("SIGHUP");
				selection.insertText(stdout += chunk, selOpts);
				editor.groupChangesSinceCheckpoint(ckpoint);
			});
			return new Promise((resolve, reject) => {
				process.on("close", (code, stdout) => code
					? reject({process, code, stdout, stderr})
					: resolve(stdout));
			});
		}));
	},
	
	
	/**
	 * Prompt user for input.
	 *
	 * @example prompt("Enter a number").then(value => …);
	 * @param {String} message - Explanatory text displayed above input field
	 * @param {String} [footnote=""] - Additional text displayed below input field
	 * @param {String} [defaultValue=""] - String to initialise input field with
	 * @return {Promise} Resolves with the user's answer, or null if they aborted.
	 * @internal
	 */
	async prompt(message, footnote = "", defaultValue = ""){
		if(!prompt.view){
			const PromptView = require("prompt-view");
			prompt.view = new PromptView({headerTagName: "label"});
		}
		return prompt.view.promptUser({
			headerText: message,
			footerText: footnote,
			input: defaultValue,
		});
	},
	
	
	/**
	 * Display the results of running an external command.
	 *
	 * @param {Object} results
	 * @return {Notification}
	 * @internal
	 */
	summarise(results){
		const {signal, code, stdout, stderr} = results;
		const message = signal
			? `Killed by signal \`${signal}\``
			: `Exited with status \`${code}\``;
		const opt = {dismissable: true};
		if(stdout || stderr)
			opt.detail = "{}";
		const note = code || signal
			? atom.notifications.addError(message, opt)
			: atom.notifications.addInfo(message, opt);
		if(stdout || stderr){
			const {element} = atom.views.getView(note);
			const detail = element.querySelector(".detail.item");
			const targets = [];
			if(stdout && stderr) targets.push(
				["stdout", detail],
				["stderr", detail.parentNode.appendChild(detail.cloneNode(true))
			]);
			else if(stdout) targets.push(["stdout", detail]);
			else if(stderr) targets.push(["stderr", detail]);
			for(const [name, node] of targets){
				const html = results[name].split(/\n/).map(line => {
					line = line.replace(/<|>|&/g, c => `&#${c.charCodeAt(0)};`);
					return `<div class="line">${line}</div>`
				}).join("");
				node.classList.add("fd");
				if(name === "stdout"){
					node.dataset.fd = 1;
					node.title = "Standard output";
				}
				else{
					node.dataset.fd = 2;
					node.title = "Standard error";
				}
				node.querySelector(".detail-content").innerHTML = html;
			}
		}
		return note;
	},
};

"use strict";

const {hasSelectedText, surround, mutate} = require("./buffer.js");
const {pipe} = require("./other.js");
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
					editor, selection, range, empty, event,
					textBefore: editor.buffer.getTextInRange(before),
					textAfter:  editor.buffer.getTextInRange(after),
				});
				if(result){
					const before = result[0] || "";
					const after  = result[1] || "";
					surround(before, after, selection);
				}
				else if(!nativeInsert){
					editor.insertText(char);
					nativeInsert = true;
				}
			}
		};
	},
	
	
	/**
	 * Prompt user for input.
	 *
	 * @example prompt("Enter a number").then(value => …);
	 * @param {String} message - Explanatory text displayed above input field
	 * @param {String} [footnote=""] - Additional text displayed below input field
	 * @return {Promise} Resolves with the user's answer, or null if they aborted.
	 * @internal
	 */
	async prompt(message, footnote = ""){
		if(!prompt.view){
			const PromptView = require("prompt-view");
			prompt.view = new PromptView({headerTagName: "label"});
		}
		return prompt.view.promptUser({
			headerText: message,
			footerText: footnote,
		});
	},
	
	
	/**
	 * Execute buffer contents using another language's interpreter.
	 *
	 * @param {String} command
	 * @param {Array} [args=["--"]]
	 * @param {String} [input=""]
	 * @return {Promise}
	 */
	async run(command, args = ["--"], input = ""){
		const editor = atom.workspace.getActiveTextEditor();
		if(!Array.isArray(args))
			args = String(args).trim().split(/\s+/);
		if(!input){
			if(editor.hasMultipleCursors())
				editor.mergeSelections(() => true);
			const selection = editor.getLastSelection();
			input = selection.getText() || editor.getText();
		}
		return pipe(input, command, args).then(result => summarise(result));
	},
	
	
	/**
	 * Modify buffer contents using standard input/output.
	 *
	 * @param {String} command
	 * @const {Array}  [args=[]]
	 * @param {Object} [options={}]
	 * @return {Promise}
	 */
	async filter(command, args = [], options = {}){
		const editor = options.editor || atom.workspace.getActiveTextEditor();
		if(editor.hasMultipleCursors())
			editor.mergeSelections(() => true);
		if(options.requireSelection && hasSelectedText(editor))
			return;
		const selection = editor.getLastSelection();
		const input = selection.getText() || editor.getText();
		if(!args.length)
			[command, ...args] = command.trim().split(/\s+/);
		return pipe(input, command, args).then(({stdout}) => {
			if(!stdout) return;
			if(!/\n$/.test(input))
				stdout = stdout.replace(/\n$/, "");
			selection.isEmpty()
				? editor.setText(stdout)
				: selection.insertText(stdout, {select: true});
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

"use strict";

const SHOW_CMD = "grammar-selector:show";
const getSelector = () => atom.workspace.getPanels("modal").find(panel =>
	panel?.item?.element?.classList.contains("grammar-selector", "select-view"));

module.exports = {
	getSelector,
	openSelector,
	selectGrammar,
};

atom.commands.add("atom-text-editor", "user:open-grammar", async () => (await selectGrammar())?.edit());

/**
 * Open the grammar-selector.
 * @return {Promise<Panel>} The modal panel containing the grammar-selector.
 * @internal
 */
async function openSelector(){
	return getSelector() || new Promise(resolve => {
		const disposable = atom.commands.onDidDispatch(async event => {
			if(SHOW_CMD !== event.type) return;
			let selector = getSelector();
			if(!selector){
				const {emitter} = atom.workspace.panelContainers.modal;
				await new Promise(done => emitter.once("did-add-panel", done));
				selector = getSelector();
			}
			disposable.dispose();
			resolve(selector);
		});
		const editor = atom.workspace.getActiveTextEditor();
		editor && atom.commands.dispatch(editor.element, SHOW_CMD);
	});
}


/**
 * Prompt the user to select a grammar.
 * @return {Promise<?Grammar>}
 * @internal
 */
async function selectGrammar(){
	const {item} = await openSelector();
	if(item && item.props){
		const {didCancelSelection, didConfirmSelection} = item.props;
		const response = await new Promise(resolve => {
			Object.assign(item.props, {
				didCancelSelection(){
					resolve(null);
					return didCancelSelection.call(this);
				},
				didConfirmSelection(grammar){
					resolve(grammar);
					return didCancelSelection.call(this);
				},
			});
			item.update();
		});
		Object.assign(item.props, {didConfirmSelection, didCancelSelection});
		return response;
	}
}

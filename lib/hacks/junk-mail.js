"use strict";

module.exports = {
	blockNotificationByPattern,
	blockNotificationByCommand,
	squelch,
};


/**
 * Block the next notification to be displayed after a specific command is run.
 *
 * @example blockNotificationByCommand("editor:log-cursor-scope");
 * @param {String} name - Name of the command to silence
 * @return {Disposable}
 * @public
 */
function blockNotificationByCommand(name){
	return atom.commands.onWillDispatch(event => {
		if(name === event.type)
			atom.notifications.emitter.once("did-add-notification", notification => {
				squelch(notification);
			});
	});
}


/**
 * Block notifications whose `.message` matches a RegExp or contains a substring.
 *
 * @example blockNotificationByPattern(/Scopes at Cursor/);
 * @param {RegExp|String} pattern
 * @return {Disposable}
 * @public
 */
function blockNotificationByPattern(pattern){
	const match = msg => "string" === pattern
		? msg.indexOf(pattern)
		: pattern.test(msg);
	return atom.notifications.onDidAddNotification(notification => {
		if(match(notification.message))
			squelch(notification);
	});
}


/**
 * Dismiss and remove a notification immediately.
 * @param {Notification} notification
 * @internal
 */
function squelch(notification){
	const view = atom.views.getView(notification);
	notification.dismiss();
	if(view && view.element){
		view.element.hidden = true;
		Object.assign(view.element.style, {
			display: "none",
			animation: "none",
			transition: "none",
		});
	}
}

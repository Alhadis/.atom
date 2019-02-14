"use strict";

const {waitToLoad} = require("../utils/other.js");

// Remove annoying tooltip from status-bar's path-copying tile
waitToLoad("status-bar").then(pkg => {
	const {fileInfo} = pkg.mainModule;
	fileInfo.tooltip.dispose();
	fileInfo.registerTooltip = () => {};
	
	// Use a more subtle acknowledgement when copying to clipboard
	const {element} = fileInfo;
	const {style} = element;
	fileInfo.showCopiedTooltip = () => style.opacity = 0.3;
	element.addEventListener("transitionend", event => {
		if("opacity" === event.propertyName && style.opacity < 1)
			style.opacity = 1;
	});
});

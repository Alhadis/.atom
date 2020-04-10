#!/usr/bin/env node

import {readFileSync} from "fs";
import {resolve} from "path";
import {extractTableData} from "../../../../Labs/Utils/index.mjs";

const dirname  = import.meta.url.replace(/^file:\/\/|[/\\][^/\\]+$/gi, "");
const jsonPath = resolve(dirname, "c1-ctrl.json");
const jsonData = JSON.parse(readFileSync(jsonPath, "utf8"));
const patterns = [];

for(const {Hex, Acronym, Name} of jsonData){
	let name = {
		0x88: "character-tabulation-set",
		0x89: "character-tabulation-with-justification",
		0x8A: "line-tabulation-set",
	}[+Hex] || (Array.isArray(Name) ? Name : [Name])
		.map(name => name
			.toLowerCase()
			.replace(/\W+/g, "-")
			.replace(/^-|-$/g, ""))
		.filter(Boolean)
		.join(".");
	if(Acronym) name = Acronym.toLowerCase() + "." + name;
	name = `punctuation.c1.ctrl-char.${name}`;
	patterns.push(`{match: "\\\\x${Hex}", name: "${name}"}`);
}
process.stdout.write(patterns.join("\n"));


/**
 * Extract C0/C1 control code data from their Wikipedia page.
 *
 * @see {@link https://en.wikipedia.org/wiki/C0_and_C1_control_codes}
 * @param {HTMLTableElement} table
 * @return {Object[]}
 */
export function extractWikiTable(table){
	table.tHead || table
		.insertBefore(document.createElement("thead"), table.tBodies[0])
		.appendChild(table.tBodies[0].rows[0]);
	for(const el of table.querySelectorAll(".reference, style")) el.remove();
	return JSON.stringify(extractTableData(table), null, "\t");
}

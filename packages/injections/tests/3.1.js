// Extended: assume magic powers
new RegExp(String.raw `(?x)
	[A-Z]+ \s+ [A-Z]+ # Comment
`);

// Unextended; assumed to be regular ECMAScript regex syntax
new RegExp(String.raw `
	[A-Z]+ \s+ [A-Z]+ # Comment
`);

xe `\A\uFEFF?\R+={80}\R`

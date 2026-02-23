XML`<?xml version="1.0"?>`;

xml`
	<?xml version="1.0" encoding="UTF-8"?>
	<!DOCTYPE inventory SYSTEM "DTDs/inventory.dtd">
	<inventory xml:lang="en">
		${list}
	</inventory>
`;

svg`
	<?xml version="1.0" encoding="utf-8"?>
	<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 100 100">
		<rect width="100%" height="100%"/>
	</svg>
`;

plist`
	<?xml version="1.0" encoding="UTF-8"?>
	<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
	<plist version="1.0">
	<dict>
		<!-- Stuff, etc -->
	</dict>
`

PROJECTS := .config/projects.cson

# Undo Project-Manager's whitespace molestation
could-you-not:
	@[ ! $$(git diff -w $(PROJECTS)) ] && git checkout -- $(PROJECTS)

.PHONY: could-you-not

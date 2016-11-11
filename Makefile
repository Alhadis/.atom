all: relink install


# Community Atom packages
installed-packages := \
	aesthetic-ui \
	atom-material-syntax \
	atom-material-syntax-dark \
	atom-material-syntax-light \
	atom-material-ui \
	auto-detect-indentation \
	duotone-dark-syntax \
	duotone-light-syntax \
	editorconfig \
	flatland-dark-ui \
	git-blame \
	language-antlr \
	language-apache \
	language-applescript \
	language-arm \
	language-asciidoc \
	language-awk \
	language-batchfile \
	language-bnf \
	language-crystal-actual \
	language-csound \
	language-diff \
	language-docker \
	language-erlang \
	language-fortran \
	language-generic-config \
	language-haskell \
	language-idl \
	language-ini \
	language-latex \
	language-lisp \
	language-llvm \
	language-lua \
	language-pascal \
	language-postscript \
	language-rust \
	language-x86 \
	language-x86-64-assembly \
	lines \
	lisp-paredit \
	MagicPython \
	make-executable \
	minimap \
	project-manager \
	seti-syntax \
	seti-ui \
	sort-lines \
	theme-reel


# Symlinked packages maintained locally
symlinks = \
	file-icons \
	Phoenix-Syntax \
	regex-comments \
	$(symlinked-forks) \
	$(symlinked-projects)

symlinked-forks := \
	language-restructuredtext \
	language-viml

symlinked-projects := \
	language-agc \
	language-apl \
	language-emacs-lisp \
	language-fontforge \
	language-maxscript \
	language-regexp \
	language-roff \
	language-turing \
	language-wavefront


# Package directory
package-dir := ~/.atom/packages

$(package-dir):
	mkdir $@


# Install community packages
install: $(package-dir) $(addprefix $(package-dir)/,$(installed-packages))

$(package-dir)/%:
	apm install $*


# Symlink locally-managed packages
relink: $(package-dir) $(addprefix $(package-dir)/,$(symlinks))

$(package-dir)/file-icons:
	ln -s ~/Labs/FI-V2 $@

$(package-dir)/Phoenix-Syntax:
	ln -s ~/Labs/Atom-PhoenixTheme $@

$(package-dir)/regex-comments:
	ln -s ~/Labs/Regex-Comments $@

$(addprefix $(package-dir)/,$(symlinked-forks)):
	ln -s ~/Forks/$(@F) $@

$(addprefix $(package-dir)/,$(symlinked-projects)):
	ln -s ~/Labs/$(@F) $@



# Undo Project-Manager's whitespace molestation
could-you-not:
	@$$(git diff --exit-code -w $(projects)) && git checkout -- $(projects)

.PHONY: could-you-not
projects := user/projects.cson

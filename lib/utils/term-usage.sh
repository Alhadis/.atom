#! /bin/sh
set -e

# Record isatty(3) states for the application that called this script
unset TTY_STDIN;  test -t 0 && { TTY_STDIN=1;  export TTY_STDIN;  } || :
unset TTY_STDOUT; test -t 1 && { TTY_STDOUT=1; export TTY_STDOUT; } || :
unset TTY_STDERR; test -t 2 && { TTY_STDERR=1; export TTY_STDERR; } || :

# Resolve verbose feedback mode
case $1 in
	--verbose)
		verbose=1;
		verb() { test -z "$verbose" || printf >&2 '%s: %s\n' "${0##*/}" "$1"; }
		shift
	;;
	*)
		unset verbose
		verb() { :; }
	;;
esac

# Assert availability of required commands
# shellcheck disable=SC2016
for cmd in sqlite3 curl xq jq; do
	if command >/dev/null 2>&1 -v "$cmd"; then continue; fi
	printf >&2 'Required command `%s` not found\n' "$1"
	return 1
done; unset cmd


# Begin the meat of the actual program
# FIXME: Mixing “~/.{atom,files}” locations like this probably shouldn't be done
db=~/.files/var/db/google-books-ngrams.db
mkdir -p "${db%/*}"
if test -f "$db"; then
	value=`sqlite3 -batch "$db" "SELECT value FROM ngrams WHERE term LIKE '$1' LIMIT 1;"`
	case $value in '');; *)
		verb "Using cached usage metric for term “$1”"
		printf %s "$value"
		test -z "$TTY_STDOUT" || echo
		exit
	;; esac
else
	verb "Creating term-usage cache: “%db”"
	sqlite3 -batch "$db" <<-SQL
		CREATE TABLE ngrams (
			term       TEXT NOT NULL,
			year_start INTEGER,
			year_end   INTEGER,
			value      NUMBER
		);
	SQL
fi

# Scrape the most recent ngram value for a Google Books term
last_ngram_value(){
	url="https://books.google.com/ngrams/graph?content=${1}&year_start=${2:-1800}&year_end=${3:-2019}&corpus=en-2019&smoothing=0&case_insensitive=true"
	verb "Scraping JSON from URL: %s" "$url"
	curl "$url" \
		| xq --html --query '#ngrams-data[type="application/json"]' \
		| JQ_COLORS='' jq -jr '.[] | select(.ngram=="'"$1"' (All)" and .parent=="") | .timeseries | last'
}
value=`last_ngram_value "$1"`

verb "Caching usage metric “$value” for term “$1”"
sqlite3 -batch "$db" <<-SQL
	INSERT INTO ngrams (term, year_start, year_end, value)
	VALUES ('$1', ${2:-1800}, ${3:-2019}, $value);
SQL

printf %s "$value"
if test -t 1; then echo; fi

=head1 SYNOPSIS

B<C<filename>> E<gt> C<module-list.txt>

=encoding utf8

=begin html

<meta name="color-scheme" content="light dark"/>
<meta name="viewport" content="initial-scale=1, minimum-scale=1"/>

=end html


=head1 DESCRIPTION

Here's a code-block:

	# Format perldoc(1) as a manual-page and display in a pager
	manpod(){
		case $1 in "$PWD"/?*)
			set -- "${1##"$PWD/"}"
		;; esac
		pod2man --section=3 --utf8 "$1" \
		| perl -pE 's/^\\& {4,}/\\&/' \
		| groff -k -mandoc -Tutf8 -rLL="${COLUMNS}n" -Wall \
		| less
	}

	# Display documentation for what's (hopefully) my first CPAN module
	manpod ~/Labs/Data-Dumper-PP/Data/Dumper/PP.pm
	
I could've written a bunch of useless crap, but instead, I chose to write
an actually useful (shell-script) snippet.

=cut

# Empty program body

__END__

=head1 FORMATTING TESTS

B<BOLD>
I<Italic>
C<Code>
L<https://link.to/>
L<text|https://link.to/>

E<lt>
E<0x3C>
E<074>
E<60>

F<~/.bash_profile>
F<filename>

S<no wrap>
X<index>
Z<>

=head2 Nested formatting tests

B<C<nested>>
I<C<nested>>
C<B<nested>(I<var>)>
F<C<~/.profile>>
S<B<Bold> and I<Italics> together.>
X<Literally I<who> uses this?>

L<This link has B<bold> txt!|https://www.wikidata.org/wiki/Q920915>
L<Escaped colon character|https://graphemica.com/E<0x3A>>

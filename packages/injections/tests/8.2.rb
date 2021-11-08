# coding: utf-8
A = {foo: []}
A.frozen? # => false
Ractor.new { puts A } # => can not access non-shareable objects by non-main Ractor.

# <pre>
# # shareable_constant_value: literal
# </pre>
# shareable_constant_value: literal
B = {foo: []}
B.frozen? # => true
B[:foo].frozen? # => true

C = [Object.new] # => cannot assign unshareable object to C (Ractor::IsolationError)

D = [Object.new.freeze]
D.frozen? # => true

# shareable_constant_value: experimental_everything
E = Set[1, 2, Object.new]
E.frozen? # => true
E.all(&:frozen?) # => true

-- Insert seed challenges
INSERT INTO challenges (title, prompt_md, hint_md, answer_pattern, is_regex, points, order_index) VALUES
(
  'Caesar Cipher',
  '**Welcome to Decrypt Night!** Your first challenge is a classic Caesar cipher.

Decrypt this message: **WKLV LV D WHVW**

The message has been shifted by 3 positions in the alphabet.',
  'Each letter has been moved 3 positions forward. A becomes D, B becomes E, etc. Don''t forget about wrapping around (X→A, Y→B, Z→C)!',
  'this is a test',
  FALSE,
  100,
  1
),
(
  'Base64 Decoding',
  'This one should look familiar to any web developer.

Decode this Base64 string: **SGVsbG8gV29ybGQ=**',
  'Base64 is a common encoding format. You can use online tools or command line utilities to decode it.',
  'hello world',
  FALSE,
  100,
  2
),
(
  'Morse Code',
  'Time to brush up on your dots and dashes!

Translate this Morse code: **.... . .-.. .-.. ---   .-- --- .-. .-.. -..**

Remember: spaces separate letters, larger spaces separate words.',
  'Each combination of dots and dashes represents a letter. Look up a Morse code chart if needed!',
  'hello world',
  FALSE,
  100,
  3
),
(
  'ROT13 Cipher',
  'A classic rotation cipher used in forums and newsgroups.

Decrypt: **PELCGBTENCUL VF SHA**

This uses a rotation of 13 positions.',
  'ROT13 is a special case of Caesar cipher where each letter is replaced by the letter 13 positions ahead. A becomes N, B becomes O, etc.',
  'cryptography is fun',
  FALSE,
  100,
  4
),
(
  'Hexadecimal to ASCII',
  'Numbers and letters, a programmer''s favorite combination.

Convert this hex to ASCII: **48656c6c6f204861636b657273**',
  'Hexadecimal (base 16) can represent ASCII characters. Each pair of hex digits represents one ASCII character.',
  'hello hackers',
  FALSE,
  100,
  5
),
(
  'Binary Message',
  'Let''s go back to the basics - ones and zeros.

Decode this binary: **01000010 01101001 01101110 01100001 01110010 01111001**

Each group of 8 bits represents one ASCII character.',
  'Binary (base 2) uses only 0s and 1s. Convert each 8-bit group to decimal, then to its ASCII character.',
  'binary',
  FALSE,
  100,
  6
),
(
  'Substitution Cipher',
  'The alphabet has been scrambled! Can you figure out the pattern?

**XFC JFVQGFK VQ: HVGXVKFG**

Hint: This is a simple monoalphabetic substitution. The most common letter in English is usually ''e''.',
  'Try frequency analysis! Look for common short words like "THE", "AND", "IS". The pattern ''XFC'' might be ''THE''.',
  'the answer is: pattern',
  FALSE,
  100,
  7
),
(
  'Flag Format Challenge',
  'Time for a real CTF-style challenge!

You''ve been given access to a mysterious server. After some reconnaissance, you discover a hidden file containing: **ZmxhZ3tjeTgzcl9uMWdodF9pc19mdW59**

The flag follows the format: flag{...}',
  'This looks like Base64 encoding. After decoding, you should get something that starts with "flag{".',
  '^flag\{.*\}$',
  TRUE,
  150,
  8
);
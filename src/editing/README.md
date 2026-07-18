# Editing

Editing notes (inserting and migrating callouts) follows a process to ensure
that edits are atomic and work correctly across different edge cases (if the
user is typing, opening and closing tabs, deleting embedded attachments, etc).

1. OCR runs against an initial snapshot of the note (slow, cancelable).
   Nothing is written during this phase.
2. Once results are ready, an edit plan is built from the note's current
   content and embed positions.
3. The plan is applied through a single editor transaction if the note is
   currently open in a source-mode editor, or an atomic disk write otherwise.
4. If the note is still changing, edits are retried (with a new edit plan
   for each attempt) until it settles. If an embedded attachment or the note
   was deleted in the meantime, it is skipped with a warning.

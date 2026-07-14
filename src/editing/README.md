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
4. If the note is being edited and the metadata cache hasn't been updated with
   the latest content yet, edits are retried (with a new edit plan) once the
   note settles. If the embed was deleted or changed, it is skipped with a warning.

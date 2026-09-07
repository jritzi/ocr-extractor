# Reading

An OCR run reads each note as a snapshot (the content as the user sees it
and the embeds corresponding to that content). Obsidian auto-saves ~2 seconds
after a change, then the metadata cache re-indexes asynchronously. So a plain
read of the file and the cache can either miss recent edits or pair fresh
content with stale embeds. Instead, we:

1. Save unsaved changes in all editors currently showing the note
2. If there were editors to save or the metadata cache hasn't finished
   re-indexing, wait until it completes (or give up after a timeout)
3. Read the content and embeds together

Anything changed after the snapshot is considered a mid-run edit, which is
handled by the editing step when inserting results.

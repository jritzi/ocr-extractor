# Extraction results

After an extraction run, each attachment is categorized as:

- **Extracted**: text extracted and callout written
- **Skipped**: there is nothing wrong with the file, but there is nothing to
  extract (e.g. an unsupported file type, a password-protected PDF)
- **Failed**: extraction failed on a file that likely has text to extract,
  and the overall run continues (e.g. a corrupt PDF, a timed-out request)
- **Ignored**: there is nothing to do, so this file isn't counted in the report
  (e.g. an embed that already has a callout, a duplicate embed)

The run as a whole can also end as:

- **Fatal**: there is a setup or service problem that would fail every remaining
  attachment the same way, so the run stops (e.g. a bad API key, a connection
  failure)
- **Canceled**: the user canceled, so stop processing new files

#!/bin/sh
# Mock OCR command that returns fixed text (controlled by the
# MOCK_OCR_OUTPUT environment variable) immediately
#
# Configure as: fast.sh {input} {output}

printf '%s' "$MOCK_OCR_OUTPUT" > "$2"

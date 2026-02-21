#!/usr/bin/env bash

# Name of the output file
OUTPUT="project_dump.txt"

# Clear the output file if it already exists
> "$OUTPUT"

echo "Bundling project files into $OUTPUT..."

# Find all files starting from current directory (.)
find . -type f | sort | while read -r file; do

    # --- FILTERING RULES ---

    # 1. Ignore the output file itself to prevent infinite loops
    if [[ "$file" == "./$OUTPUT" ]] || [[ "$file" == "./bundle_code.sh" ]]; then
        continue
    fi

    # 2. Ignore specific directories (like __pycache__ and .git)
    if [[ "$file" == *"__pycache__"* ]] || [[ "$file" == *".git"* ]]; then
        continue
    fi

    # 3. Ignore media and binary extensions
    case "$file" in
        # Images
        *.png|*.jpg|*.jpeg|*.gif|*.ico|*.svg)
            continue
            ;;
        # Audio
        *.wav|*.mp3|*.aac|*.ogg|*.flac)
            continue
            ;;
        # Python compiled bytecode and other binaries
        *.pyc|*.pyo|*.pyd|*.so|*.dll|*.exe|*.bin)
            continue
            ;;
        # Archives
        *.zip|*.tar|*.gz|*.rar)
            continue
            ;;
    esac

    # 4. Final safety check: Use grep to detect if file contains binary characters (null bytes)
    # If grep detects binary data, we skip printing the content.
    if grep -Iq . "$file" || [ ! -s "$file" ]; then
        # -I treats binary files as non-matching
        # -q suppresses output
        # [ ! -s ] includes empty files (which are technically text safe)
        
        echo "Adding: $file"
        
        # --- WRITE FORMATTING ---
        echo "################################################################################" >> "$OUTPUT"
        echo "# FILE: $file" >> "$OUTPUT"
        echo "################################################################################" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
        cat "$file" >> "$OUTPUT"
        echo -e "\n\n" >> "$OUTPUT"
    fi

done

echo "Done! All text files have been saved to $OUTPUT"

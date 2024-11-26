#!/bin/bash

set_clipboard_command() {
    case "$(uname)" in
        Linux)
            if command -v xclip &>/dev/null; then
                clipboard_cmd="xclip -selection clipboard"
            elif command -v xsel &>/dev/null; then
                clipboard_cmd="xsel --clipboard --input"
            else
                clipboard_cmd=""
                echo "Clipboard tool (xclip or xsel) not found. Clipboard functionality will be disabled."
            fi
            ;;
        Darwin) # macOS
            if command -v pbcopy &>/dev/null; then
                clipboard_cmd="pbcopy"
            else
                clipboard_cmd=""
                echo "Clipboard tool (pbcopy) not found. Clipboard functionality will be disabled."
            fi
            ;;
        MINGW* | CYGWIN* | MSYS*) # Windows
            if command -v clip &>/dev/null; then
                clipboard_cmd="clip"
            else
                clipboard_cmd=""
                echo "Clipboard tool (clip) not found. Clipboard functionality will be disabled."
            fi
            ;;
        *)
            clipboard_cmd=""
            echo "Unsupported operating system. Clipboard functionality will be disabled."
            ;;
    esac
}

get_user_input() {
    read -p "Enter the mask (comma-separated values): " mask_input
    read -p "Enter the old resolution (width,height) [1280,720]: " old_resolution
    read -p "Enter the new resolution (width,height) [640,360]: " new_resolution

    old_resolution=${old_resolution:-1280,720}
    new_resolution=${new_resolution:-640,360}
}

calculate_scaling_factors() {
    IFS=',' read -r old_width old_height <<< "$old_resolution"
    IFS=',' read -r new_width new_height <<< "$new_resolution"

    width_scale=$(awk "BEGIN {print $new_width / $old_width}")
    height_scale=$(awk "BEGIN {print $new_height / $old_height}")
}

scale_mask() {
    IFS=',' read -ra mask_coords <<< "$mask_input"
    scaled_mask=()

    for ((i=0; i<${#mask_coords[@]}; i+=2)); do
        x=$(awk "BEGIN {printf \"%d\", ${mask_coords[i]} * $width_scale}")
        y=$(awk "BEGIN {printf \"%d\", ${mask_coords[i+1]} * $height_scale}")
        scaled_mask+=("$x" "$y")
    done
}

display_output() {
    output=$(echo "${scaled_mask[*]}" | tr ' ' ',')
    echo "Scaled mask:"
    echo "$output"
}

copy_to_clipboard() {
    if [[ -n $clipboard_cmd ]]; then
        # Use printf to avoid a newline, or echo -n
        printf "%s" "$output" | $clipboard_cmd
        echo "Scaled mask copied to clipboard!"
    else
        echo "Clipboard functionality not available."
    fi
}

main() {
    set_clipboard_command
    get_user_input
    calculate_scaling_factors
    scale_mask
    display_output
    copy_to_clipboard
}

main

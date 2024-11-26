# Mask Rescaler Script

This script is designed to scale the coordinates of a mask when the resolution of the camera is changed. It adjusts the mask coordinates to fit a new resolution based on the old resolution and the scaling factors.

## Features
- Accepts user input for mask coordinates, old resolution, and new resolution.
- Calculates the scaling factors based on the resolutions and applies them to the mask coordinates.
- Displays the scaled mask coordinates.
- Optionally copies the scaled mask to the clipboard, making it easy to use in your configuration.

## Prerequisites

This script requires the following tools:
- **bash**: The script is written in bash and should run in any bash-compatible shell.
- **xclip** (Linux), **xsel** (Linux), **pbcopy** (macOS), or **clip** (Windows) for clipboard functionality.

You can install the clipboard tools with the following commands:

### Linux:
- Install `xclip`:  
  ```bash
  sudo apt install xclip
  
- Or install `xsel`:  
  ```bash
  sudo apt install xsel
  
### macOS:
- pbcopy is pre-installed, so no installation is needed.

### Windows:
- Use Git Bash, WSL, or Cygwin for Unix-like commands, including printf and echo -n.
- Alternatively, if using Windows command prompt (cmd), clip should be available.

## Usage

1. **Run the script**:
   ```bash
   ./mask_rescaler.sh
   ```

2. **Provide input** when prompted:
   - The script will ask for the mask coordinates (comma-separated), the old resolution (default: `1280,720`), and the new resolution (default: `640,360`).

   Example input:
   ```bash
   Enter the mask (comma-separated values): 682,98,716,284,469,284,442,103
   Enter the old resolution (width,height) [1280,720]: 1280,720
   Enter the new resolution (width,height) [640,360]: 640,360
   ```

3. **Result**:
   - The script will calculate the scaled mask and display it in the terminal.
   - The scaled mask is also copied to the clipboard, ready to be pasted into your Frigate or other video surveillance configuration.

## Example Output

```bash
Enter the mask (comma-separated values): 682,98,716,284,469,284,442,103
Enter the old resolution (width,height) [1280,720]: 1280,720
Enter the new resolution (width,height) [640,360]: 640,360
Scaled mask:
341,49,358,142,234,142,221,51
Scaled mask copied to clipboard!
```
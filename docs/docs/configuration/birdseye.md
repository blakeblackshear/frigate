# Birdseye

Birdseye allows a heads-up view of your cameras to see what is going on around your property / space without having to watch all cameras that may have nothing happening. Birdseye allows specific modes that intelligently show and disappear based on what you care about. 

### Birdseye Modes

Birdseye offers different modes to customize which cameras show under which circumstances.
 - **continuous:** All cameras are always included
 - **motion:** Cameras that have detected motion within the last 30 seconds are included
 - **objects:** Cameras that have tracked an active object within the last 30 seconds are included

### Custom Birdseye Icon

A custom icon can be added to the birdseye background by provided a file `custom.png` inside of the Frigate `media` folder. The file must be a png with the icon as transparent, any non-transparent pixels will be white when displayed in the birdseye view. 

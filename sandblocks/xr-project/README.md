## Instructions

This project requires two Squeak images; one running as a server and one running in the browser.
They do not have to be the same image (in fact, I recommend that the web image is fresh and somewhat small).

### Squeak server

1. Install dependencies in a natively running Squeak image

JSBridge: https://github.com/codefrau/SqueakJS/tree/main/utils/JSBridge-Core.package

3D Transforms:

```
Metacello new
	baseline: '3DTransform';
	repository: 'github://hpi-swa-lab/squeak-graphics-opengl:main/3DTransform/src/';
	load.
```

2. Load Squeak source (https://github.com/hpi-swa-lab/sandblocks-text/tree/xr/sandblocks/xr-project/squeak)

3. Run `XRRemoteService start`

### JS Server

1. Place Squeak web image into the project files (I recommend `external/`)

2. Run `(cd sandblocks/server && npm run start)`

### Running the VR application

1. If using a Meta Quest or similar device: Connect it via USB and run `adb reverse tcp:3000 tcp:3000`

2. Put on the headset and navigate to `https://localhost:3000`

3. Click "Open Project" in the top left

4. In the resulting dialog, choose "XR Project"

5. Enter the path to the Squeak web image from the root of the project

6. The project will take a couple of minutes to load (the Meta Quest 3 will continue loading even if not wearing the headset). Progress is logged in the dev console

7. Enter VR using the button in the bottom center or using the browser prompt (top right in the Meta Quest browser)

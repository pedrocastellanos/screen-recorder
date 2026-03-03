# Screen Recorder

A powerful and flexible screen recording library for the browser, built with TypeScript. It is extremely lightweight, with a build size of approximately **4.7kb (minified)**.

## Installation

Install the package using your preferred package manager:

```bash
# npm
npm install @pedrocastellanos/screen-recorder

# yarn
yarn add @pedrocastellanos/screen-recorder

# pnpm
pnpm add @pedrocastellanos/screen-recorder
```

## Usage

### Basic Setup

Add the script to your HTML file (if using directly in browser) or import it in your module.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Screen Recorder Demo</title>
</head>
<body>
    <button id="startRecording">Start Recording</button>
    <button id="stopRecording">Stop Recording</button>
    <button id="downloadRecording">Download</button>

    <script type="module">
        import { ScreenRecorder } from './path/to/dist/index.js';

        const recorder = new ScreenRecorder({
            startButtonId: 'startRecording',
            stopButtonId: 'stopRecording',
            downloadButtonId: 'downloadRecording'
        });
    </script>
</body>
</html>
```

### Advanced Usage

You can customize almost every aspect of the recording process:

```javascript
import { ScreenRecorder } from 'screen-recorder';

const recorder = new ScreenRecorder({
    startButtonId: 'btn-start',
    stopButtonId: 'btn-stop',
    audio: true,
    video: true,
    fileName: 'my-awesome-recording',
    videoBitsPerSecond: 5000000, // 5 Mbps
    frameRate: 60,
    cursor: 'motion', // Only show cursor when moving
    displaySurface: 'window' // Prefer window sharing
});

// Add event listeners
recorder.onStartRecording((fileName) => {
    console.log(`Started recording: ${fileName}`);
});

recorder.onStopRecording(() => {
    console.log('Recording stopped');
});

recorder.onDownloadRecording((fileName) => {
    console.log(`Downloaded file: ${fileName}`);
});
```

## Configuration Options

| Option | Type | Default | Description |
|Prefix|---|---|---|
| `audio` | `boolean` | `true` | Whether to record audio. |
| `video` | `boolean` | `true` | Whether to record video. |
| `startButtonId` | `string` | `'startRecording'` | ID of the HTML button to start recording. |
| `stopButtonId` | `string` | `'stopRecording'` | ID of the HTML button to stop recording. |
| `downloadButtonId` | `string` \| `'auto'` | `'auto'` | ID of the download button. If `'auto'`, download triggers automatically on stop. |
| `fileName` | `string` | `'recording'` | Base name for the downloaded file. |
| `videoFormat` | `string` | `'video/webm'` | MIME type for the Blob. |
| `mimeType` | `string` | `'video/webm;codecs=vp9,opus'` | MIME type for the MediaRecorder. |
| `videoBitsPerSecond` | `number` | `2500000` | Video bitrate (bps). |
| `audioBitsPerSecond` | `number` | `128000` | Audio bitrate (bps). |
| `frameRate` | `number` | `30` | Desired frame rate. |
| `cursor` | `'always'` \| `'motion'` \| `'never'` | `'always'` | Cursor visibility in recording. |
| `displaySurface` | `'monitor'` \| `'window'` \| `'application'` \| `'browser'` | `'monitor'` | Preferred display surface to capture. |
| `logicalSurface` | `boolean` | `true` | Whether to capture logical surface. |
| `resizeMode` | `'crop-and-scale'` \| `'none'` | `'crop-and-scale'` | Resize mode for the video track. |

## API Methods

### `startRecording(fileName?: string): Promise<void>`
Starts the recording process. You can optionally pass a filename to override the default configuration for this session.

### `stopRecording(): void`
Stops the current recording session.

### `downloadRecording(): void`
Triggers the download of the recorded video file.

### `getRecordingInfo(): RecordingInfo`
Returns an object with current recording statistics:
- `isRecording`: boolean
- `chunksCount`: number
- `totalSize`: number (bytes)
- `format`: string
- `fileName`: string

### `setFileName(fileName: string): void`
Updates the filename for the next recording.

### `resetFileName(): void`
Resets the filename to the initial configuration value.

## Events

### `onStartRecording(callback: (fileName: string) => void)`
Register a callback function to be called when recording starts.

### `onStopRecording(callback: () => void)`
Register a callback function to be called when recording stops.

### `onDownloadRecording(callback: (fileName: string) => void)`
Register a callback function to be called when the recording is downloaded. Receives the full filename with extension.

## License

ISC

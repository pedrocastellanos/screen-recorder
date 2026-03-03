interface ScreenRecorderConfig {
    audio?: boolean;
    video?: boolean;
    startButtonId?: string;
    stopButtonId?: string;
    downloadButtonId?: string | 'auto';
    fileName?: string;
    videoFormat?: string;
    mimeType?: string;
    videoBitsPerSecond?: number;
    audioBitsPerSecond?: number;
    frameRate?: number;
    displaySurface?: 'monitor' | 'window' | 'application' | 'browser';
    cursor?: 'always' | 'motion' | 'never';
    logicalSurface?: boolean;
    resizeMode?: 'crop-and-scale' | 'none';
}
interface RecordingInfo {
    isRecording: boolean;
    chunksCount: number;
    totalSize: number;
    format: string;
    fileName: string;
}
declare class ScreenRecorder {
    #private;
    /**
     * Creates a new ScreenRecorder instance
     * @param config - Configuration object
     * @throws {Error} If start and stop button IDs are the same or elements not found
     */
    constructor(config: ScreenRecorderConfig);
    /**
     * Initializes DOM elements
     * @throws {Error} If required elements are not found
     */
    private initializeElements;
    /**
     * Binds event listeners to buttons
     */
    private bindEvents;
    /**
     * Gets the current recording state
     */
    get isRecording(): boolean;
    /**
     * Sets the recording state (private setter)
     */
    private set isRecording(value);
    /**
     * Gets the current file name
     */
    get currentFileName(): string;
    /**
     * Registers a callback for when recording starts
     * @param callback - Function to execute when recording starts (receives filename as parameter)
     */
    onStartRecording(callback: (fileName: string) => void): void;
    /**
     * Registers a callback for when recording stops
     * @param callback - Function to execute when recording stops
     */
    onStopRecording(callback: () => void): void;
    /**
     * Registers a callback for when recording is downloaded
     * @param callback - Function to execute when recording is downloaded (receives filename as parameter)
     */
    onDownloadRecording(callback: (fileName: string) => void): void;
    /**
     * Builds constraints for getDisplayMedia
     * @returns ExtendedDisplayMediaStreamOptions object
     */
    private buildConstraints;
    /**
     * Gets audio stream from user media
     * @returns Promise with audio stream or null if unavailable
     */
    private getAudioStream;
    /**
     * Combines video and audio streams
     * @param audioStream - Audio stream to add to video stream
     */
    private combineStreams;
    /**
     * Gets the first supported MIME type
     * @returns Supported MIME type string
     */
    private getSupportedMimeType;
    /**
     * Programmatically starts the screen recording
     * @param fileName - Optional custom filename for this recording (overrides config)
     */
    startRecording(fileName?: string): Promise<void>;
    /**
     * Programmatically stops the current recording
     */
    stopRecording(): void;
    /**
     * Handles the stop event of MediaRecorder
     */
    private handleStop;
    /**
     * Stops all media tracks
     */
    private stopTracks;
    /**
     * Downloads the recorded video
     */
    downloadRecording(): void;
    /**
     * Gets the file extension based on video format
     * @returns File extension string
     */
    private getFileExtension;
    /**if (this.#startButton) {
            this.#startButton.disabled = isRecording;
        }
        
        if (this.#stopButton) {
            this.#stopButton.disabled = !isRecording;
        }tatus
     * @param isRecording - Current recording state
     */
    private updateButtonStates;
    /**
     * Cleans up resources
     */
    cleanup(): void;
    /**
     * Gets information about the current recording
     * @returns RecordingInfo object
     */
    getRecordingInfo(): RecordingInfo;
    /**
     * Sets a custom filename for the next recording
     * @param fileName - Custom filename
     */
    setFileName(fileName: string): void;
    /**
     * Resets filename to the default from config
     */
    resetFileName(): void;
}
export default ScreenRecorder;
export { ScreenRecorder };

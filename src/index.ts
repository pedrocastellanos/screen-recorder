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

interface ExtendedDisplayMediaStreamOptions extends DisplayMediaStreamOptions {
    video?: boolean | (MediaTrackConstraints & {
        cursor?: 'always' | 'motion' | 'never';
        logicalSurface?: boolean;
        displaySurface?: 'monitor' | 'window' | 'application' | 'browser';
        resizeMode?: 'crop-and-scale' | 'none';
    });
}

class ScreenRecorder {
    #mediaRecorder: MediaRecorder | null = null;
    #recordedChunks: Blob[] = [];
    #stream: MediaStream | null = null;
    #isRecording: boolean = false;
    #currentFileName: string;

    #startButton: HTMLButtonElement | null = null;
    #stopButton: HTMLButtonElement | null = null;
    #downloadButton: HTMLButtonElement | null = null;

    #onStartCallback: ((fileName: string) => void) | null = null;
    #onStopCallback: (() => void) | null = null;
    #onDownloadCallback: ((fileName: string) => void) | null = null;

    readonly #config: Required<ScreenRecorderConfig>;

    /**
     * Creates a new ScreenRecorder instance
     * @param config - Configuration object
     * @throws {Error} If start and stop button IDs are the same or elements not found
     */
    constructor(config: ScreenRecorderConfig) {
        // Default configuration
        this.#config = {
            audio: true,
            video: true,
            startButtonId: 'startRecording',
            stopButtonId: 'stopRecording',
            downloadButtonId: 'auto',
            fileName: 'recording',
            videoFormat: 'video/webm',
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000,
            frameRate: 30,
            displaySurface: 'monitor',
            cursor: 'always',
            logicalSurface: true,
            resizeMode: 'crop-and-scale',
            ...config
        };

        this.#currentFileName = this.#config.fileName;
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * Initializes DOM elements
     * @throws {Error} If required elements are not found
     */
    private initializeElements(): void {
        const startElement = document.getElementById(this.#config.startButtonId);
        const stopElement = document.getElementById(this.#config.stopButtonId);

        if (startElement) {
            if (!(startElement instanceof HTMLButtonElement)) {
                console.warn(`Element with ID "${this.#config.startButtonId}" is not a button`);
            } else {
                this.#startButton = startElement;
            }
        }

        if (stopElement) {
            if (!(stopElement instanceof HTMLButtonElement)) {
                console.warn(`Element with ID "${this.#config.stopButtonId}" is not a button`);
            } else {
                this.#stopButton = stopElement;
            }
        }

        if (this.#startButton && this.#stopButton && this.#startButton === this.#stopButton) {
            console.warn('Start and stop buttons are the same element');
        }

        if (this.#config.downloadButtonId && this.#config.downloadButtonId !== 'auto') {
            const downloadElement = document.getElementById(this.#config.downloadButtonId);
            if (downloadElement) {
                if (!(downloadElement instanceof HTMLButtonElement)) {
                    console.warn(`Element with ID "${this.#config.downloadButtonId}" is not a button`);
                } else {
                    this.#downloadButton = downloadElement;
                }
            }
        }
    }

    /**
     * Binds event listeners to buttons
     */
    private bindEvents(): void {
        if (this.#startButton) {
            this.#startButton.addEventListener('click', () => this.startRecording());
        }

        if (this.#stopButton) {
            this.#stopButton.addEventListener('click', () => this.stopRecording());
        }

        if (this.#downloadButton) {
            this.#downloadButton.addEventListener('click', () => this.downloadRecording());
        }
    }

    /**
     * Gets the current recording state
     */
    public get isRecording(): boolean {
        return this.#isRecording;
    }

    /**
     * Sets the recording state (private setter)
     */
    private set isRecording(value: boolean) {
        this.#isRecording = value;
    }

    /**
     * Gets the current file name
     */
    public get currentFileName(): string {
        return this.#currentFileName;
    }

    /**
     * Registers a callback for when recording starts
     * @param callback - Function to execute when recording starts (receives filename as parameter)
     */
    public onStartRecording(callback: (fileName: string) => void): void {
        if (typeof callback === 'function') {
            this.#onStartCallback = callback;
        }
    }

    /**
     * Registers a callback for when recording stops
     * @param callback - Function to execute when recording stops
     */
    public onStopRecording(callback: () => void): void {
        if (typeof callback === 'function') {
            this.#onStopCallback = callback;
        }
    }

    /**
     * Registers a callback for when recording is downloaded
     * @param callback - Function to execute when recording is downloaded (receives filename as parameter)
     */
    public onDownloadRecording(callback: (fileName: string) => void): void {
        if (typeof callback === 'function') {
            this.#onDownloadCallback = callback;
        }
    }

    /**
     * Builds constraints for getDisplayMedia
     * @returns ExtendedDisplayMediaStreamOptions object
     */
    private buildConstraints(): ExtendedDisplayMediaStreamOptions {
        const constraints: ExtendedDisplayMediaStreamOptions = {
            video: this.#config.video ? {
                displaySurface: this.#config.displaySurface,
                frameRate: this.#config.frameRate,
                cursor: this.#config.cursor,
                logicalSurface: this.#config.logicalSurface,
                resizeMode: this.#config.resizeMode
            } : false,
            audio: false // Audio is handled separately
        };

        return constraints;
    }

    /**
     * Gets audio stream from user media
     * @returns Promise with audio stream or null if unavailable
     */
    private async getAudioStream(): Promise<MediaStream | null> {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000
                }
            });
        } catch (error) {
            console.warn('Could not access audio:', error);
            return null;
        }
    }

    /**
     * Combines video and audio streams
     * @param audioStream - Audio stream to add to video stream
     */
    private combineStreams(audioStream: MediaStream): void {
        if (audioStream && this.#stream) {
            const audioTracks = audioStream.getAudioTracks();
            audioTracks.forEach(track => this.#stream!.addTrack(track));
        }
    }

    /**
     * Gets the first supported MIME type
     * @returns Supported MIME type string
     */
    private getSupportedMimeType(): string {
        const types = [
            this.#config.mimeType,
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/webm'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'video/webm';
    }

    /**
     * Programmatically starts the screen recording
     * @param fileName - Optional custom filename for this recording (overrides config)
     */
    public async startRecording(fileName?: string): Promise<void> {
        try {
            if (this.#isRecording) {
                console.warn('Recording is already in progress');
                return;
            }

            // Set custom filename if provided
            if (fileName) {
                this.#currentFileName = fileName;
            } else {
                this.#currentFileName = this.#config.fileName;
            }

            const constraints = this.buildConstraints();
            this.#stream = await navigator.mediaDevices.getDisplayMedia(constraints as DisplayMediaStreamOptions);

            if (this.#config.audio) {
                const audioStream = await this.getAudioStream();
                if (audioStream) {
                    this.combineStreams(audioStream);
                }
            }

            const mimeType = this.getSupportedMimeType();
            this.#mediaRecorder = new MediaRecorder(this.#stream, {
                mimeType,
                videoBitsPerSecond: this.#config.videoBitsPerSecond,
                audioBitsPerSecond: this.#config.audioBitsPerSecond
            });

            this.#recordedChunks = [];

            this.#mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    this.#recordedChunks.push(event.data);
                }
            };

            this.#mediaRecorder.onstop = () => this.handleStop();

            this.#mediaRecorder.start();
            this.isRecording = true;

            this.updateButtonStates(true);

            if (this.#onStartCallback) {
                this.#onStartCallback(this.#currentFileName);
            }

            console.log(`Recording started with filename: ${this.#currentFileName}`);

        } catch (error) {
            console.error('Error starting recording:', error);
            this.cleanup();
        }
    }

    /**
     * Programmatically stops the current recording
     */
    public stopRecording(): void {
        if (!this.#isRecording) {
            console.warn('No recording in progress');
            return;
        }

        if (this.#mediaRecorder && this.#mediaRecorder.state !== 'inactive') {
            this.#mediaRecorder.stop();
        }

        this.stopTracks();
    }

    /**
     * Handles the stop event of MediaRecorder
     */
    private handleStop(): void {
        this.isRecording = false;
        this.updateButtonStates(false);

        if (this.#onStopCallback) {
            this.#onStopCallback();
        }

        if (this.#config.downloadButtonId === 'auto') {
            this.downloadRecording();
        }

        console.log('Recording stopped');
    }

    /**
     * Stops all media tracks
     */
    private stopTracks(): void {
        if (this.#stream) {
            this.#stream.getTracks().forEach(track => track.stop());
        }
    }

    /**
     * Downloads the recorded video
     */
    public downloadRecording(): void {
        if (this.#recordedChunks.length === 0) {
            console.warn('No recorded data to download');
            return;
        }

        const blob = new Blob(this.#recordedChunks, {
            type: this.#config.videoFormat
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.#currentFileName}.${this.getFileExtension()}`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        if (this.#onDownloadCallback) {
            this.#onDownloadCallback(`${this.#currentFileName}.${this.getFileExtension()}`);
        }
    }

    /**
     * Gets the file extension based on video format
     * @returns File extension string
     */
    private getFileExtension(): string {
        const format = this.#config.videoFormat;
        if (format.includes('mp4')) return 'mp4';
        if (format.includes('ogg')) return 'ogg';
        return 'webm';
    }

    /**if (this.#startButton) {
            this.#startButton.disabled = isRecording;
        }
        
        if (this.#stopButton) {
            this.#stopButton.disabled = !isRecording;
        }tatus
     * @param isRecording - Current recording state
     */
    private updateButtonStates(isRecording: boolean): void {
        if (this.#startButton) {
            this.#startButton.disabled = isRecording;
        }

        if (this.#stopButton) {
            this.#stopButton.disabled = !isRecording;
        }

        if (this.#downloadButton) {
            this.#downloadButton.disabled = isRecording;
        }
    }

    /**
     * Cleans up resources
     */
    public cleanup(): void {
        this.stopTracks();
        this.#mediaRecorder = null;
        this.#stream = null;
        this.#recordedChunks = [];
        this.isRecording = false;
        this.updateButtonStates(false);
    }

    /**
     * Gets information about the current recording
     * @returns RecordingInfo object
     */
    public getRecordingInfo(): RecordingInfo {
        return {
            isRecording: this.#isRecording,
            chunksCount: this.#recordedChunks.length,
            totalSize: this.#recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0),
            format: this.#config.videoFormat,
            fileName: this.#currentFileName
        };
    }

    /**
     * Sets a custom filename for the next recording
     * @param fileName - Custom filename
     */
    public setFileName(fileName: string): void {
        this.#currentFileName = fileName;
    }

    /**
     * Resets filename to the default from config
     */
    public resetFileName(): void {
        this.#currentFileName = this.#config.fileName;
    }
}

export default ScreenRecorder;
export { ScreenRecorder };
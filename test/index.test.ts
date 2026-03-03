import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScreenRecorder } from '../src/index';

// Mock Browser APIs
const mockMediaRecorder = {
    start: vi.fn(() => { mockMediaRecorder.state = 'recording'; }),
    stop: vi.fn(() => { mockMediaRecorder.state = 'inactive'; }),
    ondataavailable: vi.fn(),
    onstop: vi.fn(),
    state: 'inactive',
    stream: {
        getTracks: vi.fn(() => []),
        addTrack: vi.fn()
    }
} as any;

globalThis.MediaRecorder = class {
    constructor(stream: MediaStream, options: any) {
        return mockMediaRecorder;
    }
} as any;
(globalThis.MediaRecorder as any).isTypeSupported = vi.fn(() => true);

const mockGetDisplayMedia = vi.fn();
const mockGetUserMedia = vi.fn();

Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getDisplayMedia: mockGetDisplayMedia,
        getUserMedia: mockGetUserMedia
    },
    writable: true
});

globalThis.URL.createObjectURL = vi.fn(() => 'blob:url');
globalThis.URL.revokeObjectURL = vi.fn();

describe('ScreenRecorder', () => {
    let recorder: ScreenRecorder;
    let startBtn: HTMLButtonElement;
    let stopBtn: HTMLButtonElement;
    let downloadBtn: HTMLButtonElement;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <button id="startRecording">Start</button>
            <button id="stopRecording">Stop</button>
            <button id="downloadRecording">Download</button>
        `;

        startBtn = document.getElementById('startRecording') as HTMLButtonElement;
        stopBtn = document.getElementById('stopRecording') as HTMLButtonElement;
        downloadBtn = document.getElementById('downloadRecording') as HTMLButtonElement;

        // Reset mocks
        vi.clearAllMocks();
        mockMediaRecorder.state = 'inactive';
        mockMediaRecorder.start.mockClear();
        mockMediaRecorder.stop.mockClear();

        // Mock stream
        const mockStream = {
            getTracks: vi.fn(() => []),
            addTrack: vi.fn()
        };
        mockGetDisplayMedia.mockResolvedValue(mockStream);
        mockGetUserMedia.mockResolvedValue({
            getAudioTracks: () => [
                { stop: vi.fn() }
            ]
        });
    });

    it('should initialize with default configuration', () => {
        recorder = new ScreenRecorder({});
        expect(recorder).toBeDefined();
        // Check initial button states (initialized in constructor)
        expect(startBtn.disabled).toBe(false);
        expect(stopBtn.disabled).toBe(true);
    });

    it('should initialize without buttons if IDs passed but elements missing', () => {
        document.body.innerHTML = ''; // Start clean
        // Should not throw even if buttons are missing (optional feature)
        const noBtnRecorder = new ScreenRecorder({
            startButtonId: 'missingStart',
            stopButtonId: 'missingStop'
        });
        expect(noBtnRecorder).toBeDefined();
    });

    it('should start recording programmatically', async () => {
        recorder = new ScreenRecorder({});
        const onStartSpy = vi.fn();
        recorder.onStartRecording(onStartSpy);

        await recorder.startRecording();

        expect(mockGetDisplayMedia).toHaveBeenCalled();
        expect(mockMediaRecorder.start).toHaveBeenCalled();
        expect(recorder.isRecording).toBe(true);
        expect(startBtn.disabled).toBe(true);
        expect(stopBtn.disabled).toBe(false);
        expect(onStartSpy).toHaveBeenCalled();
    });

    it('should not start recording if already recording', async () => {
        recorder = new ScreenRecorder({});
        await recorder.startRecording();

        // Attempt start again
        await recorder.startRecording();

        // Should ignore second call
        expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1);
    });

    it('should stop recording programmatically', async () => {
        recorder = new ScreenRecorder({});
        await recorder.startRecording();

        const onStopSpy = vi.fn();
        recorder.onStopRecording(onStopSpy);

        // Simulate recording state
        mockMediaRecorder.state = 'recording';

        recorder.stopRecording();

        expect(mockMediaRecorder.stop).toHaveBeenCalled();

        // Simulate MediaRecorder onstop event
        if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
        }

        expect(recorder.isRecording).toBe(false);
        expect(startBtn.disabled).toBe(false);
        expect(stopBtn.disabled).toBe(true);
        expect(onStopSpy).toHaveBeenCalled();
    });

    it('should handle download recording', async () => {
        recorder = new ScreenRecorder({ downloadButtonId: 'downloadRecording' });

        // Mock data available
        await recorder.startRecording();
        if (mockMediaRecorder.ondataavailable) {
            mockMediaRecorder.ondataavailable({ data: new Blob(['test'], { type: 'video/webm' }) } as any);
        }

        const onDownloadSpy = vi.fn();
        recorder.onDownloadRecording(onDownloadSpy);

        // Manually trigger download
        recorder.downloadRecording();

        expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
        expect(onDownloadSpy).toHaveBeenCalled();
    });

    it('should start recording when start button is clicked', async () => {
        recorder = new ScreenRecorder({ startButtonId: 'startRecording', stopButtonId: 'stopRecording' });
        startBtn.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockGetDisplayMedia).toHaveBeenCalled();
        expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should stop recording when stop button is clicked', async () => {
        recorder = new ScreenRecorder({});
        await recorder.startRecording(); // Start first

        // Reset call count because startRecording might trigger things
        mockMediaRecorder.stop.mockClear();

        // Simulate recording state
        recorder['isRecording'] = true; // Force internal state if needed, though startRecording handles it

        stopBtn.click();

        expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should request audio stream if configured', async () => {
        recorder = new ScreenRecorder({ audio: true });
        await recorder.startRecording();
        expect(mockGetUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: expect.anything() }));
    });

    it('should NOT request audio stream if disabled in config', async () => {
        recorder = new ScreenRecorder({ audio: false });
        await recorder.startRecording();
        expect(mockGetUserMedia).not.toHaveBeenCalled();
    });

    it('should use custom filename if provided in startRecording', async () => {
        recorder = new ScreenRecorder({ fileName: 'default' });
        const onStartSpy = vi.fn();
        recorder.onStartRecording(onStartSpy);

        await recorder.startRecording('custom-name');

        expect(recorder.currentFileName).toBe('custom-name');
        expect(onStartSpy).toHaveBeenCalledWith('custom-name');
    });

    it('should update filename with setFileName', () => {
        recorder = new ScreenRecorder({ fileName: 'default' });
        recorder.setFileName('new-name');
        expect(recorder.currentFileName).toBe('new-name');
    });

    it('should reset filename to default', () => {
        recorder = new ScreenRecorder({ fileName: 'default' });
        recorder.setFileName('changed');
        recorder.resetFileName();
        expect(recorder.currentFileName).toBe('default');
    });

    it('should return correct recording info', async () => {
        recorder = new ScreenRecorder({ videoFormat: 'video/webm' });
        await recorder.startRecording();

        // Simulate data
        if (mockMediaRecorder.ondataavailable) {
            mockMediaRecorder.ondataavailable({ data: new Blob(['chunk1'], { type: 'video/webm' }) } as any);
            mockMediaRecorder.ondataavailable({ data: new Blob(['chunk2'], { type: 'video/webm' }) } as any);
        }

        const info = recorder.getRecordingInfo();
        expect(info.isRecording).toBe(true);
        expect(info.chunksCount).toBe(2);
        // Blob size might depend on implementation, but chunksCount is reliable here
        expect(info.fileName).toBe('recording');
        expect(info.format).toBe('video/webm');
    });

    it('should handle getDisplayMedia error gracefully', async () => {
        // Mock failing getDisplayMedia
        mockGetDisplayMedia.mockRejectedValueOnce(new Error('Permission denied'));

        // Spy on console.error to avoid jsdom noise
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        recorder = new ScreenRecorder({});
        await recorder.startRecording();

        expect(consoleSpy).toHaveBeenCalled();
        expect(recorder.isRecording).toBe(false);
        consoleSpy.mockRestore();
    });

    it('should fallback to supported mime type', async () => {
        // Mock isTypeSupported to fail for the first few options
        const originalIsTypeSupported = (globalThis.MediaRecorder as any).isTypeSupported;
        (globalThis.MediaRecorder as any).isTypeSupported = vi.fn((mime) => {
            return mime === 'video/webm'; // Only support simple webm
        });

        recorder = new ScreenRecorder({ mimeType: 'video/unsupported' });
        await recorder.startRecording();

        expect(mockMediaRecorder.start).toHaveBeenCalled();

        (globalThis.MediaRecorder as any).isTypeSupported = originalIsTypeSupported;
    });
});


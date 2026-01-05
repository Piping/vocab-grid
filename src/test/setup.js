import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

class MockWorker {
  constructor() {
    this.onmessage = null;
    queueMicrotask(() => {
      this.onmessage?.({ data: { type: 'worker-ready' } });
      this.onmessage?.({
        data: {
          type: 'voices-list',
          voices: [{ key: 'en_US-hfc_female-medium', name: 'en_US-hfc_female-medium' }],
        },
      });
    });
  }

  postMessage(message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'get-voices') {
      this.onmessage?.({
        data: {
          type: 'voices-list',
          voices: [{ key: 'en_US-hfc_female-medium', name: 'en_US-hfc_female-medium' }],
        },
      });
    } else if (message.type === 'set-voice') {
      this.onmessage?.({ data: { type: 'voice-set', voiceId: message.voiceId } });
    }
  }

  terminate() {}
}

class MockAudio {
  constructor() {
    this.preload = '';
    this.src = '';
    this.currentTime = 0;
    this.pause = vi.fn();
    this.play = vi.fn(() => Promise.resolve());
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
  }
}

class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.onend = null;
    this.onerror = null;
  }
}

beforeEach(() => {
  localStorage.clear();

  vi.spyOn(console, 'log').mockImplementation(() => {});

  vi.stubGlobal('Worker', MockWorker);
  vi.stubGlobal('Audio', MockAudio);
  vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      cancel: vi.fn(),
      speak: vi.fn((utter) => {
        setTimeout(() => {
          utter?.onend?.();
        }, 0);
      }),
    },
  });

  if (!URL.createObjectURL) {
    // JSDOM doesn't always implement this.
    // @ts-expect-error - allow stubbing missing API
    URL.createObjectURL = vi.fn(() => 'blob:mock');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock');
  }
  if (!URL.revokeObjectURL) {
    // @ts-expect-error - allow stubbing missing API
    URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }

  vi.stubGlobal('alert', vi.fn());
});

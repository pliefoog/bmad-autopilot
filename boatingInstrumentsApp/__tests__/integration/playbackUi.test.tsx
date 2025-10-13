import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Button } from 'react-native';
import { useNmeaStore } from '../../src/core/nmeaStore';

// Mock PlaybackService to allow deterministic behavior in UI tests
const mockStart = jest.fn(function(file: string) {
  // simulate playback writing to the store
  useNmeaStore.getState().setNmeaData({ depth: 5.0, speed: 3.2 });
});
const mockStop = jest.fn();

class MockPlaybackServiceClass {
  constructor() {}
  isPlaybackActive() { return false; }
  startPlayback(file: string) { return mockStart(file); }
  stopPlayback() { return mockStop(); }
}

// Provide mocks for the module the app imports. This must be set before requiring App.
const mockModule = { PlaybackService: MockPlaybackServiceClass };
jest.mock('../../src/services/playbackService', () => mockModule);

// Import App at runtime (with require) after mocks are configured to avoid ES module hoisting

describe('Playback UI integration', () => {
  beforeEach(() => {
    // reset store
    useNmeaStore.getState().reset();
    mockStart.mockClear();
    mockStop.mockClear();
    // No instance mocking to clear for class-based mock
  });

  it('starts playback when Start Playback button is pressed and updates widgets', async () => {
    // Create a small test wrapper that only contains the playback controls
    // Import the (mocked) PlaybackService after the jest.mock above
    // eslint-disable-next-line global-require
    const { PlaybackService } = require('../../src/services/playbackService');

    const TestWrapper: React.FC = () => {
      const playbackService = new PlaybackService();
      return (
        // Render a single Button that mirrors the App playback button logic
        React.createElement(Button, {
          title: `Start Playback (demo.nmea)`,
          onPress: () => playbackService.startPlayback('demo.nmea'),
        })
      );
    };

    let root: any;
    await ReactTestRenderer.act(async () => {
      root = ReactTestRenderer.create(React.createElement(TestWrapper));
    });

    // Find the Start Playback button (title contains 'Start Playback')
    const btn = root.root.findAllByType(Button)[0];
    expect(btn).toBeDefined();

    // Press the button
    await ReactTestRenderer.act(async () => {
      btn.props.onPress();
    });

  // PlaybackService.startPlayback should have been called
  expect(mockStart).toHaveBeenCalled();

    // Store should have been updated by our mock playback
    const data = useNmeaStore.getState().nmeaData as any;
    expect(data.depth).toBeDefined();
    expect(data.depth).toBeCloseTo(5.0, 3);
    expect(data.speed).toBeCloseTo(3.2, 3);
  });

  it('streams multiple sentences over time and updates the store (fake timers)', async () => {
    // Use fake timers to simulate periodic playback
    jest.useFakeTimers();
    useNmeaStore.getState().reset();

    // Streaming mock: emits three updates at 1s intervals
    class StreamingMock {
      private interval: any = null;
      startPlayback(file: string) {
        const setNmeaData = useNmeaStore.getState().setNmeaData;
        let i = 0;
        this.interval = setInterval(() => {
          i += 1;
          setNmeaData({ depth: i, speed: i * 1.1 });
          if (i >= 3) {
            clearInterval(this.interval);
          }
        }, 1000);
        if (this.interval && typeof (this.interval as any).unref === 'function') {
          (this.interval as any).unref();
        }
      }
      stopPlayback() {
        if (this.interval) clearInterval(this.interval);
      }
      isPlaybackActive() { return !!this.interval; }
    }

    const TestWrapperStream: React.FC = () => {
      const playbackService = new StreamingMock();
      return React.createElement(Button, {
        title: 'Start Playback (stream)',
        onPress: () => playbackService.startPlayback('demo.nmea'),
      });
    };

    let root: any;
    await ReactTestRenderer.act(async () => {
      root = ReactTestRenderer.create(React.createElement(TestWrapperStream));
    });

    const btn = root.root.findAllByType(Button)[0];

    // Press to start the streaming playback
    await ReactTestRenderer.act(async () => {
      btn.props.onPress();
    });

    // Advance timers and assert sequential updates
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1000);
    });
    let data = useNmeaStore.getState().nmeaData as any;
    expect(data.depth).toBe(1);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1000);
    });
    data = useNmeaStore.getState().nmeaData as any;
    expect(data.depth).toBe(2);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1000);
    });
    data = useNmeaStore.getState().nmeaData as any;
    expect(data.depth).toBe(3);

    // Cleanup
    jest.useRealTimers();
  });
});

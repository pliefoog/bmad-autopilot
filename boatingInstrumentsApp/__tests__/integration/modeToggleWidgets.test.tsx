import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Button, Text } from 'react-native';
import { DepthWidget } from '../../src/widgets/DepthWidget';
import { SpeedWidget } from '../../src/widgets/SpeedWidget';
import { useNmeaStore } from '../../src/core/nmeaStore';

/**
 * Integration test: verify switching between playback and live modes updates widgets
 * and that no stale values persist after toggling.
 */
describe('Mode toggle: playback <-> live widgets', () => {
  beforeEach(() => {
    useNmeaStore.getState().reset();
    jest.clearAllTimers();
  });

  it('updates widgets when switching modes and does not keep stale values', async () => {
    // Mocked services that write to the store
    class MockPlaybackService {
      startPlayback(_file: string) {
        useNmeaStore.getState().setNmeaData({ depth: 7.0, sog: 4.5 });
      }
      stopPlayback() {
        // noop
      }
      isPlaybackActive() { return false; }
    }

    class MockConnectionManager {
      connect() {
        useNmeaStore.getState().setNmeaData({ depth: 2.3, sog: 1.2 });
      }
      disconnect() {
        // Simulate connection teardown that clears data
        useNmeaStore.getState().reset();
      }
    }

    // Small test app that exposes buttons to toggle modes and renders widgets
    const TestApp: React.FC = () => {
      const playback = new MockPlaybackService();
      const conn = new MockConnectionManager();
      return (
        // Use simple Buttons to trigger mocked services and render widgets
        React.createElement(React.Fragment, null,
          React.createElement(Button, { title: 'Start Playback', onPress: () => playback.startPlayback('demo.nmea') }),
          React.createElement(Button, { title: 'Switch to Live', onPress: () => conn.connect() }),
          React.createElement(Button, { title: 'Disconnect Live', onPress: () => conn.disconnect() }),
          React.createElement(DepthWidget),
          React.createElement(SpeedWidget)
        )
      );
    };

    let root: any;
    await ReactTestRenderer.act(async () => {
      root = ReactTestRenderer.create(React.createElement(TestApp));
    });

    const buttons = root.root.findAllByType(Button);
    const btnPlayback = buttons.find((b: any) => b.props.title === 'Start Playback');
    const btnLive = buttons.find((b: any) => b.props.title === 'Switch to Live');
    const btnDisconnect = buttons.find((b: any) => b.props.title === 'Disconnect Live');

    // Start playback -> widgets should show playback values
    await ReactTestRenderer.act(async () => {
      btnPlayback.props.onPress();
    });

    // DepthWidget renders value text; search Text nodes for the numeric value
    const textsAfterPlayback = root.root.findAllByType(Text).map((t: any) => t.props.children).flat();
    expect(textsAfterPlayback.join(' ')).toContain('7');
    expect(textsAfterPlayback.join(' ')).toContain('4.5');

    // Switch to live -> widgets should update to live values
    await ReactTestRenderer.act(async () => {
      btnLive.props.onPress();
    });

    const textsAfterLive = root.root.findAllByType(Text).map((t: any) => t.props.children).flat();
    expect(textsAfterLive.join(' ')).toContain('2.3');
    expect(textsAfterLive.join(' ')).toContain('1.2');

    // Disconnect live -> widgets should show -- or empty (no stale playback values)
    await ReactTestRenderer.act(async () => {
      btnDisconnect.props.onPress();
    });

    const textsAfterDisconnect = root.root.findAllByType(Text).map((t: any) => t.props.children).flat();
    const allText = textsAfterDisconnect.join(' ');
    // Should not contain previous numeric values
    expect(allText).not.toContain('7');
    expect(allText).not.toContain('4.5');
    expect(allText).not.toContain('2.3');
    expect(allText).not.toContain('1.2');
  });
});

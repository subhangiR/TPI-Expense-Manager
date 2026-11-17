// Adds matchers like toBeInTheDocument(), and the TextEncoder that react-router needs in jsdom.
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom has no EventSource (live updates), so tests use a do-nothing stand-in.
class FakeEventSource {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  addEventListener() {}
  close() {}
}
Object.assign(globalThis, { EventSource: FakeEventSource });

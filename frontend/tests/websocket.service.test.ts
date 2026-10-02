import { createWebSocketService, type WsStatus } from '../services/websocket';
import type { Lead } from '../types/lead';

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  simulateOpen() {
    this.onopen?.();
  }
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  simulateClose() {
    this.onclose?.();
  }
}

let mockWs: MockWebSocket;

beforeEach(() => {
  jest.useFakeTimers();
  mockWs = new MockWebSocket();
  (globalThis as unknown as Record<string, unknown>).WebSocket = jest.fn(() => mockWs);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const baseLead: Lead = {
  id: 'lead_1',
  metaLeadId: 'meta_1',
  formId: 'form_1',
  pageId: 'page_1',
  name: 'John',
  email: 'john@example.com',
  phone: null,
  customFields: null,
  createdTime: '2024-01-01T00:00:00Z',
  receivedAt: '2024-01-01T00:00:00Z',
};

describe('createWebSocketService', () => {
  it('calls onStatusChange("connecting") on init', () => {
    const onStatusChange = jest.fn();
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange,
      onReconnect: jest.fn(),
    });
    expect(onStatusChange).toHaveBeenCalledWith('connecting');
  });

  it('calls onStatusChange("connected") when socket opens', () => {
    const onStatusChange = jest.fn();
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange,
      onReconnect: jest.fn(),
    });
    mockWs.simulateOpen();
    expect(onStatusChange).toHaveBeenCalledWith('connected');
  });

  it('calls onLeadCreated when lead.created message arrives', () => {
    const onLeadCreated = jest.fn();
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated,
      onStatusChange: jest.fn(),
      onReconnect: jest.fn(),
    });
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'lead.created', data: baseLead });
    expect(onLeadCreated).toHaveBeenCalledWith(baseLead);
  });

  it('does not call onLeadCreated for unknown message types', () => {
    const onLeadCreated = jest.fn();
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated,
      onStatusChange: jest.fn(),
      onReconnect: jest.fn(),
    });
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'other.event', data: {} });
    expect(onLeadCreated).not.toHaveBeenCalled();
  });

  it('calls onStatusChange("offline") and schedules reconnect on close', () => {
    const onStatusChange = jest.fn();
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange,
      onReconnect: jest.fn(),
    });
    mockWs.simulateOpen();
    mockWs.simulateClose();
    expect(onStatusChange).toHaveBeenCalledWith('offline');
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff for retries', () => {
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange: jest.fn(),
      onReconnect: jest.fn(),
    });
    mockWs.simulateClose(); // retry 1 â€” 1s
    jest.advanceTimersByTime(999);
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

    mockWs.simulateClose(); // retry 2 â€” 2s
    jest.advanceTimersByTime(1999);
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(3);
  });

  it('calls onReconnect only on reconnect, not first connect', () => {
    const onReconnect = jest.fn();
    createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange: jest.fn(),
      onReconnect,
    });
    mockWs.simulateOpen();
    expect(onReconnect).not.toHaveBeenCalled();

    mockWs.simulateClose();
    jest.advanceTimersByTime(1000);
    mockWs.simulateOpen();
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect after destroy()', () => {
    const service = createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange: jest.fn(),
      onReconnect: jest.fn(),
    });
    mockWs.simulateOpen();
    service.destroy();
    mockWs.simulateClose();
    jest.advanceTimersByTime(5000);
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
  });

  it('closes socket on destroy()', () => {
    const service = createWebSocketService({
      url: 'ws://test',
      onLeadCreated: jest.fn(),
      onStatusChange: jest.fn(),
      onReconnect: jest.fn(),
    });
    service.destroy();
    expect(mockWs.close).toHaveBeenCalled();
  });
});

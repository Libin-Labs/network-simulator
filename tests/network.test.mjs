import assert from 'node:assert/strict';
import test from 'node:test';
import { createNetworkSimulator } from '../dist/esm/index.js';

test('same seed and same calls produce identical simulations', () => {
  const options = {
    seed: 42,
    minLatencyMs: 10,
    maxLatencyMs: 60,
    dropRate: 0.2,
    bytesPerSecond: 1000,
  };
  const first = createNetworkSimulator(options);
  const second = createNetworkSimulator(options);
  const requests = Array.from({ length: 10 }, (_, requestBytes) => ({
    requestBytes,
    responseBytes: 20,
  }));
  assert.deepEqual(
    requests.map((request) => first.simulate(request)),
    requests.map((request) => second.simulate(request)),
  );
});

test('models delivered bandwidth transfer and sequence numbers', () => {
  const network = createNetworkSimulator({
    seed: 1,
    minLatencyMs: 10,
    maxLatencyMs: 10,
    bytesPerSecond: 2000,
  });
  assert.deepEqual(network.simulate({ requestBytes: 1000, responseBytes: 2000 }), {
    sequence: 1,
    outcome: 'delivered',
    requestLatencyMs: 10,
    responseLatencyMs: 10,
    transferMs: 1500,
    simulatedDurationMs: 1520,
    requestBytes: 1000,
    responseBytes: 2000,
  });
});

test('drop and disconnect rates deterministically produce their failure modes', () => {
  const dropped = createNetworkSimulator({ seed: 2, dropRate: 1 }).simulate({
    requestBytes: 10,
    responseBytes: 20,
  });
  assert.equal(dropped.outcome, 'dropped');
  assert.equal(dropped.responseBytes, 0);
  const disconnected = createNetworkSimulator({ seed: 2, disconnectRate: 1 }).simulate({
    requestBytes: 10,
    responseBytes: 20,
  });
  assert.equal(disconnected.outcome, 'disconnected');
  assert.equal(disconnected.responseBytes, 0);
});

test('reset repeats the original stream and snapshot sequence resets', () => {
  const network = createNetworkSimulator({ seed: 7, minLatencyMs: 0, maxLatencyMs: 10 });
  const first = network.simulate({ requestBytes: 1 });
  network.simulate({ requestBytes: 2 });
  assert.equal(network.snapshot().sequence, 2);
  network.reset();
  assert.equal(network.snapshot().sequence, 0);
  assert.deepEqual(network.simulate({ requestBytes: 1 }), first);
});

test('rejects invalid policies, seeds and payloads', () => {
  assert.throws(() => createNetworkSimulator({ seed: -1 }), RangeError);
  assert.throws(() => createNetworkSimulator({ seed: 1, dropRate: 1.1 }), RangeError);
  assert.throws(
    () => createNetworkSimulator({ seed: 1, minLatencyMs: 2, maxLatencyMs: 1 }),
    RangeError,
  );
  const network = createNetworkSimulator({ seed: 1, maxBytes: 10 });
  assert.throws(() => network.simulate({ requestBytes: -1 }), RangeError);
  assert.throws(() => network.simulate({ requestBytes: 11 }), RangeError);
  assert.throws(
    () =>
      createNetworkSimulator({ seed: 1, bytesPerSecond: Number.MIN_VALUE }).simulate({
        requestBytes: 1,
      }),
    /overflowed/,
  );
});

export type NetworkOutcome = 'delivered' | 'dropped' | 'disconnected';

export type SimulationRequest = Readonly<{
  requestBytes: number;
  responseBytes?: number;
}>;

export type SimulationResult = Readonly<{
  sequence: number;
  outcome: NetworkOutcome;
  requestLatencyMs: number;
  responseLatencyMs: number;
  transferMs: number;
  simulatedDurationMs: number;
  requestBytes: number;
  responseBytes: number;
}>;

export type NetworkSimulatorOptions = Readonly<{
  seed: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
  dropRate?: number;
  disconnectRate?: number;
  bytesPerSecond?: number;
  maxBytes?: number;
}>;

export type NetworkSimulator = Readonly<{
  simulate(request: SimulationRequest): SimulationResult;
  snapshot(): Readonly<{ state: number; sequence: number }>;
  reset(seed?: number): void;
}>;

function finiteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${label} must be finite and nonnegative`);
}

function probability(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved < 0 || resolved > 1) {
    throw new RangeError(`${label} must be between 0 and 1`);
  }
  return resolved;
}

function positiveSeed(seed: number): number {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('seed must be an unsigned 32-bit integer');
  }
  return seed || 0x6d2b79f5;
}

export function createNetworkSimulator(options: NetworkSimulatorOptions): NetworkSimulator {
  if (!options || typeof options !== 'object') throw new TypeError('options are required');
  let state = positiveSeed(options.seed);
  let sequence = 0;
  const minLatencyMs = options.minLatencyMs ?? 0;
  const maxLatencyMs = options.maxLatencyMs ?? minLatencyMs;
  finiteNonNegative(minLatencyMs, 'minLatencyMs');
  finiteNonNegative(maxLatencyMs, 'maxLatencyMs');
  if (maxLatencyMs < minLatencyMs)
    throw new RangeError('maxLatencyMs must be at least minLatencyMs');
  const dropRate = probability(options.dropRate, 0, 'dropRate');
  const disconnectRate = probability(options.disconnectRate, 0, 'disconnectRate');
  const bytesPerSecond = options.bytesPerSecond ?? Number.POSITIVE_INFINITY;
  if (!(bytesPerSecond > 0) || Number.isNaN(bytesPerSecond)) {
    throw new RangeError('bytesPerSecond must be positive');
  }
  const maxBytes = options.maxBytes ?? 10_000_000;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
    throw new RangeError('maxBytes must be nonnegative');

  function random(): number {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  }

  function latency(): number {
    return minLatencyMs + random() * (maxLatencyMs - minLatencyMs);
  }

  const simulator: NetworkSimulator = {
    simulate(request) {
      if (
        !request ||
        !Number.isSafeInteger(request.requestBytes) ||
        request.requestBytes < 0 ||
        !Number.isSafeInteger(request.responseBytes ?? 0) ||
        (request.responseBytes ?? 0) < 0
      ) {
        throw new RangeError('request and response sizes must be nonnegative safe integers');
      }
      const requestBytes = request.requestBytes;
      const responseBytes = request.responseBytes ?? 0;
      if (requestBytes + responseBytes > maxBytes) throw new RangeError('Payload exceeds maxBytes');
      const requestLatencyMs = latency();
      const dropped = random() < dropRate;
      const disconnected = !dropped && random() < disconnectRate;
      const responseLatencyMs = dropped || disconnected ? 0 : latency();
      const transferMs =
        bytesPerSecond === Number.POSITIVE_INFINITY
          ? 0
          : ((requestBytes + (dropped || disconnected ? 0 : responseBytes)) / bytesPerSecond) *
            1000;
      const simulatedDurationMs = requestLatencyMs + responseLatencyMs + transferMs;
      if (!Number.isFinite(transferMs) || !Number.isFinite(simulatedDurationMs)) {
        throw new RangeError('Simulated duration overflowed');
      }
      const outcome: NetworkOutcome = dropped
        ? 'dropped'
        : disconnected
          ? 'disconnected'
          : 'delivered';
      return Object.freeze({
        sequence: ++sequence,
        outcome,
        requestLatencyMs,
        responseLatencyMs,
        transferMs,
        simulatedDurationMs,
        requestBytes,
        responseBytes: dropped || disconnected ? 0 : responseBytes,
      });
    },
    snapshot() {
      return Object.freeze({ state: state >>> 0, sequence });
    },
    reset(seed = options.seed) {
      state = positiveSeed(seed);
      sequence = 0;
    },
  };
  return Object.freeze(simulator);
}

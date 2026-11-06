# @lp-labs/network-simulator

A deterministic seeded utility for modeling latency, bandwidth, packet drops, and disconnects.
It returns simulated outcomes without opening sockets or making actual network requests.
Zero runtime and peer dependencies.

## Install

```bash
npm install @lp-labs/network-simulator
```

ESM, CommonJS, and TypeScript declarations are included.

## Quickstart

```js
import { createNetworkSimulator } from '@lp-labs/network-simulator';

const network = createNetworkSimulator({
  seed: 42,
  minLatencyMs: 20,
  maxLatencyMs: 80,
  dropRate: 0.1,
  bytesPerSecond: 50_000,
});
const firstAttempt = network.simulate({ requestBytes: 1200, responseBytes: 800 });
if (!['delivered', 'dropped', 'disconnected'].includes(firstAttempt.outcome)) {
  throw new Error('Unexpected outcome');
}
```

## API

- `createNetworkSimulator(options)` constructs an isolated pseudo-random stream.
- `NetworkSimulator.simulate({ requestBytes, responseBytes? })` returns a frozen result with
  sequence, outcome, request/response latency, transfer time, simulated duration, and delivered
  byte counts.
- `NetworkSimulator.snapshot()` returns the current unsigned PRNG state and simulation sequence.
- `NetworkSimulator.reset(seed?)` restarts the stream and resets sequence to zero.

`NetworkSimulatorOptions` requires an unsigned 32-bit `seed`. Optional `minLatencyMs` defaults to
zero, `maxLatencyMs` defaults to the minimum, `dropRate` and `disconnectRate` default to zero,
`bytesPerSecond` defaults to unlimited, and `maxBytes` defaults to 10,000,000. Latencies must be
finite and nonnegative, rates must be in [0, 1], throughput must be positive, and byte counts must
be nonnegative safe integers. Both sizes together must not exceed `maxBytes`.

## Customization and limits

Each instance has its own xorshift32 generator; repeating a seed and call sequence repeats outcomes.
Drop is decided before disconnect, and a dropped/disconnected request has no response transfer.
Latency is sampled uniformly within the configured range for each active direction. Duration is a
virtual estimate, not elapsed wall-clock time; the library does not delay execution, emulate TCP,
model packet fragmentation, retry requests, or emulate server behavior. Simulation state is
single-threaded and not designed for shared workers.

## Exported types

`NetworkOutcome`, `SimulationRequest`, `SimulationResult`, `NetworkSimulatorOptions`, and
`NetworkSimulator` document the full runtime API.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.

import {
  createNetworkSimulator,
  type NetworkOutcome,
  type SimulationRequest,
  type SimulationResult,
} from '@lp-labs/network-simulator';

const request: SimulationRequest = { requestBytes: 120, responseBytes: 48 };
const simulator = createNetworkSimulator({ seed: 12, maxLatencyMs: 40 });
const result: SimulationResult = simulator.simulate(request);
const outcome: NetworkOutcome = result.outcome;
simulator.reset();
void outcome;

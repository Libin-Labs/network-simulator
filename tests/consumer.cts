import { createNetworkSimulator, type NetworkSimulatorOptions } from '@lp-labs/network-simulator';
const options: NetworkSimulatorOptions = { seed: 7, dropRate: 0.1 };
const simulator = createNetworkSimulator(options);
const snapshot: Readonly<{ state: number; sequence: number }> = simulator.snapshot();
void snapshot;

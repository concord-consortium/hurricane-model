import * as seedrandom from "seedrandom";
// inexplicably, no longer exported
type SeedRandomPrng = ReturnType<seedrandom>;

const SEED = "HurricaneModel";
let rand: SeedRandomPrng | null = null;

export function initialize(deterministic: boolean) {
  // state: true enables state saving, entropy controls whether random generator is deterministic or not.
  rand = seedrandom(SEED, { state: true, entropy: !deterministic });
}

export function initializeFromState(state: any) {
  // When state is provided, the first argument, seed, is ignored.
  rand = seedrandom("", { state });
}

export function getState(): any {
  if (rand) {
    return rand.state();
  } else {
    throw new Error("seedrandom not initialized");
  }
}

export function random() {
  if (rand) {
    return rand();
  } else {
    throw new Error("seedrandom not initialized");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Module-level Mutable Indicator State
//  This is kept separate from the store to avoid unnecessary re-renders
//  Reset via resetIndicatorState() on symbol/timeframe change
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ADXState,
  ATRState,
  BBState,
  CCIState,
  CVDState,
  MACDState,
  OBVState,
  PsarState,
  RSIState,
  SuperTrendState,
  VWAPState,
  WillRState,
} from '../indicators';
import {
  makeADXState,
  makeATRState,
  makeBBState,
  makeCCIState,
  makeCVDState,
  makeMACDState,
  makeOBVState,
  makePsarState,
  makeRSIState,
  makeSuperTrendState,
  makeVWAPState,
  makeWillRState,
} from '../indicators';

export interface IndicatorStateContainer {
  rsiState: RSIState;
  prevClose: number | null;
  e9: number | null;
  e20: number | null;
  e50: number | null;
  macdState: MACDState;
  bbState: BBState;
  atrState: ATRState;
  stState: SuperTrendState;
  adxState: ADXState;
  obvState: OBVState;
  willRState: WillRState;
  cciState: CCIState;
  psarState: PsarState;
  vwapState: VWAPState;
  cvdState: CVDState;
}

function makeIndicatorStateContainer(): IndicatorStateContainer {
  return {
    rsiState: makeRSIState(),
    prevClose: null,
    e9: null,
    e20: null,
    e50: null,
    macdState: makeMACDState(),
    bbState: makeBBState(),
    atrState: makeATRState(),
    stState: makeSuperTrendState(),
    adxState: makeADXState(),
    obvState: makeOBVState(),
    willRState: makeWillRState(),
    cciState: makeCCIState(),
    psarState: makePsarState(),
    vwapState: makeVWAPState(),
    cvdState: makeCVDState(),
  };
}

// Single module-level instance — reset when sym/tf changes
let _indState = makeIndicatorStateContainer();

export function resetIndicatorState() {
  _indState = makeIndicatorStateContainer();
}

export function getIndicatorState(): IndicatorStateContainer {
  return _indState;
}

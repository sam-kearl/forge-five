/**
 * Advertising abstraction.
 *
 * No real ad SDK is integrated. Before one is, it must pass the review listed in
 * docs/REVIEW_ITEMS.md (Apple Kids/age-rating policy, Google Play Families,
 * COPPA and regional privacy law). Any real implementation must:
 *  - request only non-personalised, contextual, child-appropriate ads;
 *  - disable remarketing and advertising-identifier access;
 *  - set the most restrictive content rating.
 *
 * Gameplay never depends on this service. Every failure path resolves to
 * "no ad", and the app behaves identically.
 */

export type AdPlacement = 'home' | 'results';

export interface AdContent {
  id: string;
  /** Plain text shown inside the clearly labelled ad frame (mock only). */
  headline: string;
  body: string;
}

export type AdLoadResult =
  { status: 'loaded'; ad: AdContent } | { status: 'unavailable'; reason: 'not-configured' | 'offline' | 'failed' | 'blocked' | 'no-fill' };

export interface AdService {
  /** Name for diagnostics, e.g. "none" or "mock". */
  readonly provider: string;
  initialize(): Promise<void>;
  load(placement: AdPlacement): Promise<AdLoadResult>;
  /** Let a player or parent report an inappropriate ad, if the provider supports it. */
  report?(adId: string, reason: string): Promise<void>;
}

/** Default: advertising switched off entirely. */
export class NoAdService implements AdService {
  readonly provider = 'none';
  async initialize() {}
  async load(): Promise<AdLoadResult> {
    return { status: 'unavailable', reason: 'not-configured' };
  }
}

/**
 * Development mock that shows neutral placeholder copy in the ad frame.
 * `behaviour` lets tests and the developer menu simulate failures.
 */
export class MockAdService implements AdService {
  readonly provider = 'mock';
  reports: { adId: string; reason: string }[] = [];
  constructor(public behaviour: 'fill' | 'fail' | 'offline' | 'slow-fail' = 'fill') {}
  async initialize() {}
  async load(placement: AdPlacement): Promise<AdLoadResult> {
    if (this.behaviour === 'fail') return { status: 'unavailable', reason: 'failed' };
    if (this.behaviour === 'offline') return { status: 'unavailable', reason: 'offline' };
    if (this.behaviour === 'slow-fail') {
      await new Promise((r) => setTimeout(r, 1500));
      return { status: 'unavailable', reason: 'failed' };
    }
    return {
      status: 'loaded',
      ad: { id: `mock-${placement}`, headline: 'Sample advertisement', body: 'Placeholder shown while no ad provider is configured.' },
    };
  }
  async report(adId: string, reason: string) {
    this.reports.push({ adId, reason });
  }
}

/**
 * Where ads may appear. Pure so it can be tested; the UI must consult it.
 * Ads never appear during equation building, never after every puzzle, and never for ad-free players.
 */
export interface AdContext {
  placement: AdPlacement;
  adFree: boolean;
  /** Total puzzles solved, for spacing results-screen placements. */
  solvedCount: number;
  /** True while a puzzle is being worked on. */
  inActivePuzzle: boolean;
}

export const RESULTS_AD_EVERY = 4;

export function mayShowAd(ctx: AdContext): boolean {
  if (ctx.adFree || ctx.inActivePuzzle) return false;
  if (ctx.placement === 'home') return true;
  // Results: only after a handful of solves, never after every puzzle.
  return ctx.solvedCount > 0 && ctx.solvedCount % RESULTS_AD_EVERY === 0;
}

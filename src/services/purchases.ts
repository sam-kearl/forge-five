/**
 * In-app purchase abstraction. The only product is a one-time, non-consumable
 * "remove ads" unlock bought by a parent (behind the parental gate).
 *
 * The production implementation (StoreKit / Play Billing via a reviewed
 * library) is not integrated yet; see docs/REVIEW_ITEMS.md.
 */

export const REMOVE_ADS_PRODUCT_ID = 'forgefive.removeads';

export interface Product {
  id: string;
  title: string;
  /** Localised price string from the store, e.g. "$2.99". */
  displayPrice: string;
}

export type PurchaseResult =
  { status: 'success'; productId: string } | { status: 'cancelled' } | { status: 'pending' } | { status: 'failed'; message: string };

export type RestoreResult =
  { status: 'restored'; productIds: string[] } | { status: 'nothing-to-restore' } | { status: 'failed'; message: string };

export interface PurchaseService {
  readonly provider: string;
  getProducts(): Promise<Product[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
}

/** Simulated store for development and tests. */
export class MockPurchaseService implements PurchaseService {
  readonly provider = 'mock';
  private owned = new Set<string>();
  /** The outcome the next purchase() call will produce. */
  nextPurchase: 'success' | 'cancel' | 'fail' | 'pending' = 'success';
  nextRestoreFails = false;
  latencyMs = 0;

  constructor(options: { owned?: string[]; latencyMs?: number } = {}) {
    options.owned?.forEach((p) => this.owned.add(p));
    this.latencyMs = options.latencyMs ?? 0;
  }

  private wait() {
    return this.latencyMs ? new Promise((r) => setTimeout(r, this.latencyMs)) : Promise.resolve();
  }

  async getProducts(): Promise<Product[]> {
    await this.wait();
    return [{ id: REMOVE_ADS_PRODUCT_ID, title: 'Remove ads', displayPrice: '$2.99 (sample)' }];
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    await this.wait();
    switch (this.nextPurchase) {
      case 'cancel':
        return { status: 'cancelled' };
      case 'fail':
        return { status: 'failed', message: 'The store could not complete the purchase.' };
      case 'pending':
        return { status: 'pending' };
      case 'success':
        this.owned.add(productId);
        return { status: 'success', productId };
    }
  }

  async restore(): Promise<RestoreResult> {
    await this.wait();
    if (this.nextRestoreFails) return { status: 'failed', message: 'The store could not be reached.' };
    return this.owned.size ? { status: 'restored', productIds: [...this.owned] } : { status: 'nothing-to-restore' };
  }
}

/**
 * No store connected (store and web builds until a real provider is integrated).
 * The app hides Remove ads and the Parents screen when this is in use.
 */
export class NoPurchaseService implements PurchaseService {
  readonly provider = 'none';
  async getProducts(): Promise<Product[]> {
    return [];
  }
  async purchase(): Promise<PurchaseResult> {
    return { status: 'failed', message: 'Purchases are not available in this version.' };
  }
  async restore(): Promise<RestoreResult> {
    return { status: 'nothing-to-restore' };
  }
}

/** Whether this build can sell or restore anything (and so shows the Parents screen). */
export const purchasesAvailable = (p: PurchaseService) => p.provider !== 'none';

// ---------------------------------------------------------------------------
// Entitlements: the locally cached result of purchases (pure logic, tested).
// ---------------------------------------------------------------------------

export interface Entitlements {
  adFree: boolean;
  /** When the entitlement was last confirmed by the store (ms since epoch), for diagnostics. */
  confirmedAt: number | null;
}

export const NO_ENTITLEMENTS: Entitlements = { adFree: false, confirmedAt: null };

export function applyPurchaseResult(e: Entitlements, r: PurchaseResult, now: number): Entitlements {
  return r.status === 'success' && r.productId === REMOVE_ADS_PRODUCT_ID ? { adFree: true, confirmedAt: now } : e;
}

export function applyRestoreResult(e: Entitlements, r: RestoreResult, now: number): Entitlements {
  if (r.status === 'restored' && r.productIds.includes(REMOVE_ADS_PRODUCT_ID)) return { adFree: true, confirmedAt: now };
  // A failed or empty restore never removes an entitlement the device already holds.
  return e;
}

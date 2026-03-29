import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleBillingReconcile, handleBillingDrift } from "../../commands/billing";

describe("billing commands", () => {
  let originalStripeKey: string | undefined;

  beforeEach(() => {
    originalStripeKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (originalStripeKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
    }
  });

  describe("reconcile", () => {
    it("throws when STRIPE_SECRET_KEY is not set", async () => {
      await expect(
        handleBillingReconcile({ dryRun: true }, () => {}),
      ).rejects.toThrow("STRIPE_SECRET_KEY is required");
    });
  });

  describe("drift", () => {
    it("throws when STRIPE_SECRET_KEY is not set", async () => {
      await expect(
        handleBillingDrift(() => {}),
      ).rejects.toThrow("STRIPE_SECRET_KEY is required");
    });
  });
});

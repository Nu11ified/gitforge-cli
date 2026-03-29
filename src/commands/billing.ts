import type { Command } from "commander";

type Logger = (msg: string) => void;

/**
 * Reconcile options for the billing command.
 */
interface ReconcileOpts {
  dryRun?: boolean;
}

/**
 * Handle `gitforge billing reconcile [--dry-run]`.
 *
 * Dynamically imports @gitforge/billing to avoid hard dependency at module
 * load time — the billing package requires Stripe which may not be available
 * in all environments.
 */
export async function handleBillingReconcile(
  opts: ReconcileOpts,
  log: Logger = console.log,
): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is required. Set it in your environment.",
    );
  }

  // Dynamic imports to keep the CLI lightweight
  const { default: Stripe } = await import("stripe");
  const { billingConfig } = await import("@gitforge/billing");
  const { reconcileStripeConfig } = await import(
    "@gitforge/billing/src/stripe-reconcile"
  );

  const stripe = new Stripe(stripeKey);
  const dryRun = opts.dryRun ?? false;

  if (dryRun) {
    log("[billing] Running in dry-run mode — no changes will be made.\n");
  }

  const result = await reconcileStripeConfig(
    billingConfig.plans,
    stripe as any,
    { dryRun },
  );

  // Report created
  for (const item of result.created) {
    log(`  CREATE  ${item.type}  ${item.name}  ${item.id}`);
  }

  // Report updated
  for (const item of result.updated) {
    log(`  UPDATE  ${item.type}  ${item.name}  ${item.id}`);
    for (const change of item.changes) {
      log(`          ${change}`);
    }
  }

  // Report unchanged
  for (const item of result.unchanged) {
    log(`  OK      ${item.type}  ${item.name}  ${item.id}`);
  }

  // Report errors
  for (const item of result.errors) {
    log(`  ERROR   ${item.type}  ${item.name}  ${item.error}`);
  }

  log("");
  log(
    `[billing] ${dryRun ? "Dry run" : "Reconcile"} complete: ` +
      `${result.created.length} created, ` +
      `${result.updated.length} updated, ` +
      `${result.unchanged.length} unchanged, ` +
      `${result.errors.length} errors`,
  );

  if (result.errors.length > 0) {
    throw new Error("Reconciliation completed with errors");
  }
}

/**
 * Handle `gitforge billing drift`.
 */
export async function handleBillingDrift(
  log: Logger = console.log,
): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is required. Set it in your environment.",
    );
  }

  const { default: Stripe } = await import("stripe");
  const { billingConfig } = await import("@gitforge/billing");
  const { detectDrift } = await import(
    "@gitforge/billing/src/stripe-reconcile"
  );

  const stripe = new Stripe(stripeKey);
  const report = await detectDrift(billingConfig.plans, stripe as any);

  if (report.inSync) {
    log("[billing] All Stripe resources are in sync with config.");
    return;
  }

  log("[billing] Drift detected:\n");

  for (const item of report.missing) {
    log(`  MISSING  ${item.type}  ${item.name}`);
  }

  for (const item of report.extra) {
    log(`  EXTRA    ${item.type}  ${item.name}  (${item.id})`);
  }

  for (const item of report.drifted) {
    log(
      `  DRIFT    ${item.type}  ${item.name}  ${item.field}: ` +
        `expected=${item.expected}, actual=${item.actual}`,
    );
  }

  log(
    `\n[billing] ${report.missing.length} missing, ` +
      `${report.extra.length} extra, ` +
      `${report.drifted.length} drifted`,
  );
}

/**
 * Register billing subcommands with commander.
 */
export function registerBillingCommands(program: Command): void {
  const billing = program
    .command("billing")
    .description("Manage Stripe billing configuration");

  billing
    .command("reconcile")
    .description("Reconcile plans.config.ts against Stripe")
    .option("--dry-run", "Preview changes without applying them")
    .action(async (opts) => {
      try {
        await handleBillingReconcile(
          { dryRun: opts.dryRun },
          console.log,
        );
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  billing
    .command("drift")
    .description("Detect drift between config and Stripe state")
    .action(async () => {
      try {
        await handleBillingDrift(console.log);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

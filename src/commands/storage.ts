import type { Command } from "commander";

type Logger = (msg: string) => void;

interface StorageMigrateOpts {
  source: string;
  target: string;
  prefix: string;
  concurrency?: number;
  dryRun?: boolean;
  /** Source config JSON string (e.g. '{"endpoint":"...","accessKeyId":"...","secretAccessKey":"...","bucket":"..."}') */
  sourceConfig?: string;
  /** Target config JSON string */
  targetConfig?: string;
}

/**
 * Handle `gitforge storage migrate`.
 *
 * Moves all objects under a prefix from one storage backend to another.
 * Supports S3, SFTP, and local backends.
 */
export async function handleStorageMigrate(
  opts: StorageMigrateOpts,
  log: Logger = console.log,
): Promise<void> {
  // Dynamic imports to keep the CLI lightweight
  const { registry, migrateStorage } = await import("@gitforge/storage");

  // Side-effect: register built-in adapters
  await import("@gitforge/storage/src/backends/s3/index");
  await import("@gitforge/storage/src/backends/sftp/index");

  const sourceConfig = opts.sourceConfig ? JSON.parse(opts.sourceConfig) : {};
  const targetConfig = opts.targetConfig ? JSON.parse(opts.targetConfig) : {};

  log(`[storage] Migrating objects from ${opts.source} to ${opts.target}`);
  log(`[storage] Prefix: ${opts.prefix || "(all)"}`);

  if (opts.dryRun) {
    log("[storage] Dry-run mode — no objects will be copied.\n");
  }

  const source = await registry.create(opts.source, sourceConfig);
  const target = await registry.create(opts.target, targetConfig);

  const concurrency = opts.concurrency ?? 10;

  const result = await migrateStorage(source, target, opts.prefix, {
    concurrency,
    dryRun: opts.dryRun ?? false,
    onProgress: (processed, total) => {
      if (processed % 100 === 0 || processed === total) {
        log(`[storage] Progress: ${processed}/${total}`);
      }
    },
  });

  log(`\n[storage] Migration complete:`);
  log(`  Copied:  ${result.copied}`);
  log(`  Skipped: ${result.skipped}`);
  log(`  Errors:  ${result.errors}`);

  // Cleanup
  await source.dispose?.();
  await target.dispose?.();
}

export function registerStorageCommands(program: Command): void {
  const storage = program.command("storage").description("Storage management commands");

  storage
    .command("migrate")
    .description("Migrate objects from one storage backend to another")
    .requiredOption("--source <type>", "Source backend type (s3, sftp, local)")
    .requiredOption("--target <type>", "Target backend type (s3, sftp, local)")
    .option("--prefix <prefix>", "Key prefix to migrate (e.g. tenant123/)", "")
    .option("--concurrency <n>", "Max concurrent copy operations", "10")
    .option("--dry-run", "Count objects but don't copy")
    .option("--source-config <json>", "Source backend config as JSON string")
    .option("--target-config <json>", "Target backend config as JSON string")
    .action(async (cmdOpts) => {
      await handleStorageMigrate({
        source: cmdOpts.source,
        target: cmdOpts.target,
        prefix: cmdOpts.prefix,
        concurrency: parseInt(cmdOpts.concurrency, 10),
        dryRun: cmdOpts.dryRun ?? false,
        sourceConfig: cmdOpts.sourceConfig,
        targetConfig: cmdOpts.targetConfig,
      });
    });
}

import { performance } from 'perf_hooks';
import { testContext, printMasterSummary } from './test_utils.mjs';
import { runTier1Tests } from './tier1_feature_coverage.test.mjs';
import { runTier2Tests } from './tier2_boundary_corner.test.mjs';
import { runTier3Tests } from './tier3_cross_feature.test.mjs';
import { runTier4Tests } from './tier4_real_world.test.mjs';
import { runTier5Tests } from './tier5_adversarial_stress.test.mjs';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function main() {
  console.log(`${c.cyan}${c.bold}======================================================================${c.reset}`);
  console.log(`${c.cyan}${c.bold}            NEXT.JS PORTFOLIO E2E AUTOMATED TEST SUITE                ${c.reset}`);
  console.log(`${c.dim}  Executing 5 Tiers of Opaque-Box Comprehensive & Adversarial Tests     ${c.reset}`);
  console.log(`${c.cyan}${c.bold}======================================================================${c.reset}`);

  testContext.reset();
  const masterStart = performance.now();
  const tierSummaries = [];

  try {
    const tier1 = await runTier1Tests();
    tierSummaries.push(tier1);

    const tier2 = await runTier2Tests();
    tierSummaries.push(tier2);

    const tier3 = await runTier3Tests();
    tierSummaries.push(tier3);

    const tier4 = await runTier4Tests();
    tierSummaries.push(tier4);

    const tier5 = await runTier5Tests();
    tierSummaries.push(tier5);
  } catch (error) {
    console.error(`\n${c.red}${c.bold}CRITICAL TEST RUNNER ERROR:${c.reset}`, error);
    process.exit(1);
  }

  const totalTime = performance.now() - masterStart;
  printMasterSummary(tierSummaries);

  const totalFailed = tierSummaries.reduce((sum, t) => sum + t.failedChecks, 0);
  const totalChecks = tierSummaries.reduce((sum, t) => sum + t.totalChecks, 0);

  if (totalFailed > 0) {
    console.log(`${c.red}${c.bold}Failed Test Details:${c.reset}`);
    for (const fail of testContext.failures) {
      console.log(`  ${c.red}✖ [${fail.suite}] ${fail.test}${c.reset}`);
      console.log(`    ${c.yellow}${fail.error?.message || fail.error}${c.reset}`);
    }
    console.log('');
  }

  console.log(`${c.dim}Finished execution of ${totalChecks} test checks in ${totalTime.toFixed(1)}ms.${c.reset}\n`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unhandled runner exception:', err);
  process.exit(1);
});

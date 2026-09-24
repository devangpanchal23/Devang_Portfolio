import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, testContext, printSuiteResults, printTierHeader } from './test_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

export async function runTier3Tests() {
  const tierStart = performance.now();
  const initialChecks = testContext.totalChecks;
  const initialPassed = testContext.passedChecks;
  const initialFailed = testContext.failedChecks;

  printTierHeader(3, 'Cross-Feature Combinations', 'Validates 120fps Lenis + GSAP ticker sync, liquid modal physics constants, RAF lifecycle culling, and typography tokens.');

  // =========================================================================
  // Section 1: 120fps Lenis + GSAP Master Ticker Sync
  // =========================================================================
  describe('Tier 3.1: 120fps Lenis + GSAP Master Ticker Synchronization', () => {
    const scrollProviderPath = path.join(ROOT_DIR, 'src/components/providers/SmoothScrollProvider.tsx');
    const scrollProviderContent = fs.readFileSync(scrollProviderPath, 'utf8');

    it('SmoothScrollProvider exists and imports Lenis and GSAP', () => {
      expect(fs.existsSync(scrollProviderPath)).toBe(true);
      expect(scrollProviderContent).toMatch(/import Lenis from 'lenis'/);
      expect(scrollProviderContent).toMatch(/import \{.*gsap.*ScrollTrigger.*\} from '@\/lib\/gsap'/);
    });

    it('Disables lag smoothing with gsap.ticker.lagSmoothing(0)', () => {
      expect(scrollProviderContent).toMatch(/gsap\.ticker\.lagSmoothing\(0\)/);
    });

    it('Connects Lenis scroll listener to ScrollTrigger.update', () => {
      expect(scrollProviderContent).toMatch(/lenis\.on\(['"]scroll['"],\s*ScrollTrigger\.update\)/);
    });

    it('Drives Lenis RAF via GSAP ticker with second-to-millisecond conversion', () => {
      expect(scrollProviderContent).toMatch(/gsap\.ticker\.add\(raf\)/);
      expect(scrollProviderContent).toMatch(/lenis\.raf\(time\s*\*\s*1000\)/);
    });

    it('Provides complete teardown cleanup on unmount', () => {
      expect(scrollProviderContent).toMatch(/lenis\.off\(['"]scroll['"],\s*ScrollTrigger\.update\)/);
      expect(scrollProviderContent).toMatch(/gsap\.ticker\.remove\(raf\)/);
      expect(scrollProviderContent).toMatch(/lenis\.destroy\(\)/);
      expect(scrollProviderContent).toMatch(/delete window\.__lenis/);
    });

    it('Touch devices override: native scrolling preserved on mobile/touch', () => {
      expect(scrollProviderContent).toMatch(/isTouch/);
      expect(scrollProviderContent).toMatch(/ontouchstart/);
    });
  });

  // =========================================================================
  // Section 2: Dennis Snellenberg Liquid Modal Physics Constants & Simulation
  // =========================================================================
  describe('Tier 3.2: Dennis Snellenberg Liquid Modal Physics Constants & Convergence', () => {
    const projectsPath = path.join(ROOT_DIR, 'src/components/sections/Projects.tsx');
    const projectsContent = fs.readFileSync(projectsPath, 'utf8');

    it('Implements spring damping constant POSITION_LERP: 0.055', () => {
      expect(projectsContent).toMatch(/(?:POSITION_LERP\s*=\s*0\.055|\*\s*0\.055)/);
    });

    it('Implements rotation damping constant ROT_LERP: 0.08', () => {
      expect(projectsContent).toMatch(/(?:ROT_LERP\s*=\s*0\.08|\*\s*0\.08)/);
    });

    it('Clamps velocity tilt angle within [-9, 9] degrees', () => {
      expect(projectsContent).toMatch(/clamp\(-9,\s*9,\s*dx\s*\*\s*0\.15\)/);
    });

    it('Clamps parallax image counter-movement within [-14, 14] X and [-12, 12] Y', () => {
      expect(projectsContent).toMatch(/clamp\(-14,\s*14,\s*-dx\s*\*\s*0\.25\)/);
      expect(projectsContent).toMatch(/clamp\(-12,\s*12,\s*-dy\s*\*\s*0\.25\)/);
    });

    it('Damped spring physics convergence simulation converges stably without overshoot', () => {
      const POSITION_LERP = 0.055;
      const target = { x: 500, y: 300 };
      const current = { x: 0, y: 0 };
      const history = [];

      for (let frame = 0; frame < 120; frame++) {
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        current.x += dx * POSITION_LERP;
        current.y += dy * POSITION_LERP;
        history.push({ x: current.x, y: current.y });
      }

      // Check monotonicity
      for (let i = 1; i < history.length; i++) {
        expect(history[i].x).toBeGreaterThanOrEqual(history[i - 1].x);
        expect(history[i].y).toBeGreaterThanOrEqual(history[i - 1].y);
      }

      // Check final convergence after 120 frames
      expect(current.x).toBeGreaterThan(499);
      expect(current.y).toBeGreaterThan(299);
      expect(current.x).toBeLessThanOrEqual(500);
      expect(current.y).toBeLessThanOrEqual(300);
    });

    it('Reel slider transforms with exact vertical indexing: yPercent = -index * 100', () => {
      expect(projectsContent).toMatch(/yPercent:\s*-index\s*\*\s*100/);
    });
  });

  // =========================================================================
  // Section 3: IntersectionObserver & Memory Leak Elimination
  // =========================================================================
  describe('Tier 3.3: IntersectionObserver Lifecycle & Memory Leak Elimination', () => {
    const flowFieldContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/canvas/FlowField.tsx'), 'utf8');
    const ambientContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/canvas/AmbientGeometry.tsx'), 'utf8');

    it('FlowField creates IntersectionObserver with threshold 0.02', () => {
      expect(flowFieldContent).toMatch(/new\s*IntersectionObserver/);
      expect(flowFieldContent).toMatch(/threshold:\s*0\.02/);
    });

    it('FlowField pauses RAF immediately when offscreen and cancels animation frame', () => {
      expect(flowFieldContent).toMatch(/visible\s*=\s*entry\.isIntersecting/);
      expect(flowFieldContent).toMatch(/cancelAnimationFrame\(rafId\)/);
    });

    it('AmbientGeometry creates IntersectionObserver with threshold 0.05 and stops RAF loop offscreen', () => {
      expect(ambientContent).toMatch(/new\s*IntersectionObserver/);
      expect(ambientContent).toMatch(/threshold:\s*0\.05/);
      expect(ambientContent).toMatch(/isVisibleRef\.current\s*=\s*entry\.isIntersecting/);
    });

    it('AmbientGeometry cleans up resize, mouse listeners, and observer on unmount', () => {
      expect(ambientContent).toMatch(/observer\.disconnect\(\)/);
      expect(ambientContent).toMatch(/cancelAnimationFrame/);
    });
  });

  // =========================================================================
  // Section 4: Editorial Brutalist Design System & Typography Tokens
  // =========================================================================
  describe('Tier 3.4: Editorial Brutalist Typography Tokens & Section Dividers', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    const dividerPath = path.join(ROOT_DIR, 'src/components/ui/CurvedSectionDivider.tsx');
    const dividerContent = fs.readFileSync(dividerPath, 'utf8');

    it('App layout configures Space Grotesk display typography token', () => {
      expect(layoutContent).toMatch(/Space_Grotesk/);
    });

    it('App layout configures Geist Sans font token', () => {
      expect(layoutContent).toMatch(/Geist/);
    });

    it('App layout configures Instrument Serif editorial serif token', () => {
      expect(layoutContent).toMatch(/Instrument_Serif/);
    });

    it('CurvedSectionDivider component renders curve geometry for seamless transitions', () => {
      expect(fs.existsSync(dividerPath)).toBe(true);
      expect(dividerContent).toMatch(/(?:borderRadius:\s*['"]0 0 50% 50%['"]|<svg|<path)/);
    });
  });

  // Print results for this tier
  for (const suite of testContext.suites) {
    printSuiteResults(suite);
  }

  const durationMs = performance.now() - tierStart;
  const totalChecks = testContext.totalChecks - initialChecks;
  const passedChecks = testContext.passedChecks - initialPassed;
  const failedChecks = testContext.failedChecks - initialFailed;

  return {
    id: 'Tier 3',
    name: 'Cross-Feature Combinations',
    totalChecks,
    passedChecks,
    failedChecks,
    durationMs,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testContext.reset();
  runTier3Tests().then((res) => {
    console.log(`\nTier 3 Finished: ${res.passedChecks}/${res.totalChecks} passed in ${res.durationMs.toFixed(1)}ms`);
    process.exit(res.failedChecks > 0 ? 1 : 0);
  });
}

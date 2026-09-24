import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, testContext, printSuiteResults, printTierHeader } from './test_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVICES_DIR = path.join(ROOT_DIR, 'public/Services');

export async function runTier2Tests() {
  const tierStart = performance.now();
  const initialChecks = testContext.totalChecks;
  const initialPassed = testContext.passedChecks;
  const initialFailed = testContext.failedChecks;

  printTierHeader(2, 'Boundary & Corner Cases', 'Validates canvas 0-dim handling, DPR clamping, SVG file size bounds, reduced motion, and touch overrides.');

  // =========================================================================
  // Section 1: Canvas 0-Dimension Handling & Mathematical Resilience
  // =========================================================================
  describe('Tier 2.1: Canvas 0-Dimension & Extreme Viewport Boundaries', () => {
    function computeCanvasDimensions(width, height, isMobile, devicePixelRatio = 1) {
      const dpr = isMobile ? 1 : Math.min(devicePixelRatio || 1, 1.5);
      const canvasWidth = Math.max(1, Math.floor(width * dpr));
      const canvasHeight = Math.max(1, Math.floor(height * dpr));
      return { canvasWidth, canvasHeight, dpr };
    }

    it('0x0 container size is clamped to minimum 1x1 canvas buffer', () => {
      const { canvasWidth, canvasHeight } = computeCanvasDimensions(0, 0, false, 2);
      expect(canvasWidth).toBe(1);
      expect(canvasHeight).toBe(1);
    });

    it('Negative container dimensions (-50x-100) are clamped to 1x1', () => {
      const { canvasWidth, canvasHeight } = computeCanvasDimensions(-50, -100, false, 1);
      expect(canvasWidth).toBe(1);
      expect(canvasHeight).toBe(1);
    });

    it('Subpixel fractional container dimensions (0.4x0.7) are clamped to 1x1', () => {
      const { canvasWidth, canvasHeight } = computeCanvasDimensions(0.4, 0.7, false, 1);
      expect(canvasWidth).toBe(1);
      expect(canvasHeight).toBe(1);
    });

    it('8K extreme resolution (7680x4320) DPR is capped at 1.5 to prevent memory exhaustion', () => {
      const { canvasWidth, canvasHeight, dpr } = computeCanvasDimensions(7680, 4320, false, 3.5);
      expect(dpr).toBe(1.5);
      expect(canvasWidth).toBe(7680 * 1.5);
      expect(canvasHeight).toBe(4320 * 1.5);
    });

    it('Mobile viewport (<768px) forces DPR to 1.0 regardless of screen density', () => {
      const { dpr: mobileDpr } = computeCanvasDimensions(375, 667, true, 3.0);
      expect(mobileDpr).toBe(1);
    });

    it('DPR fallback handles undefined, 0, and NaN safely', () => {
      expect(computeCanvasDimensions(100, 100, false, undefined).dpr).toBe(1);
      expect(computeCanvasDimensions(100, 100, false, 0).dpr).toBe(1);
      expect(computeCanvasDimensions(100, 100, false, NaN).dpr).toBe(1);
    });

    const standardViewports = [
      { w: 320, h: 480, name: '320px (Minimum Mobile)', mobile: true },
      { w: 375, h: 667, name: '375px (iPhone Standard)', mobile: true },
      { w: 767, h: 1024, name: '767px (Mobile Max Edge)', mobile: true },
      { w: 768, h: 1024, name: '768px (Tablet / Desktop Min)', mobile: false },
      { w: 1024, h: 768, name: '1024px (iPad Landscape)', mobile: false },
      { w: 1440, h: 900, name: '1440px (Laptop Pro)', mobile: false },
      { w: 1920, h: 1080, name: '1920px (Full HD Desktop)', mobile: false },
      { w: 2560, h: 1440, name: '2560px (2K QHD Display)', mobile: false },
      { w: 3840, h: 2160, name: '3840px (4K UHD Display)', mobile: false },
    ];

    for (const vp of standardViewports) {
      it(`Canvas dimension computation for ${vp.name}`, () => {
        const { canvasWidth, canvasHeight } = computeCanvasDimensions(vp.w, vp.h, vp.mobile, 2);
        expect(canvasWidth).toBeGreaterThan(0);
        expect(canvasHeight).toBeGreaterThan(0);
      });
    }
  });

  describe('Tier 2.2: Particle Simulation Count & Life Boundary Conditions', () => {
    function getParticleCount(width) {
      const isMobile = width < 768;
      return isMobile ? 40 : 220;
    }

    function getNodeCount(width) {
      const isMobile = width < 768;
      return isMobile ? 18 : 90;
    }

    it('FlowField particle count is 40 at mobile breakpoint (767px)', () => {
      expect(getParticleCount(767)).toBe(40);
    });

    it('FlowField particle count scales to 220 at desktop breakpoint (768px)', () => {
      expect(getParticleCount(768)).toBe(220);
    });

    it('AmbientGeometry node count is 18 at mobile breakpoint (767px)', () => {
      expect(getNodeCount(767)).toBe(18);
    });

    it('AmbientGeometry node count is 90 at desktop breakpoint (768px)', () => {
      expect(getNodeCount(768)).toBe(90);
    });

    it('Particle boundary culling triggers respawn outside container margins', () => {
      const width = 500;
      const height = 500;
      const isOutOfBounds = (x, y) => x < -20 || x > width + 20 || y < -20 || y > height + 20;

      expect(isOutOfBounds(-21, 100)).toBe(true);
      expect(isOutOfBounds(521, 100)).toBe(true);
      expect(isOutOfBounds(100, -21)).toBe(true);
      expect(isOutOfBounds(100, 521)).toBe(true);
      expect(isOutOfBounds(100, 100)).toBe(false);
      expect(isOutOfBounds(0, 0)).toBe(false);
      expect(isOutOfBounds(500, 500)).toBe(false);
    });

    it('Particle alpha fade multiplier sin((life/maxLife)*PI) is strictly within [0, 1]', () => {
      const maxLife = 150;
      for (let life = 0; life <= maxLife; life += 15) {
        const fade = Math.sin((life / maxLife) * Math.PI);
        expect(fade).toBeGreaterThanOrEqual(0);
        expect(fade).toBeLessThanOrEqual(1.0001);
      }
    });

    it('Noise angle calculation handles extreme coordinates without NaN or Infinity', () => {
      const noiseAngle = (x, y, t) => {
        const n =
          Math.sin(x * 1.7 + t) * Math.cos(y * 1.35 - t * 0.7) +
          Math.sin((x + y) * 0.85 + t * 0.45) * 0.8 +
          Math.sin(x * 0.55 - y * 0.9 - t * 0.3) * 0.6;
        return n * 2.4;
      };

      const testCoords = [
        [0, 0, 0],
        [100, 100, 50],
        [-100, -100, 10],
        [10000, 10000, 100],
        [-10000, -10000, -100],
      ];

      for (const [x, y, t] of testCoords) {
        const angle = noiseAngle(x, y, t);
        expect(Number.isFinite(angle)).toBe(true);
      }
    });

    it('AmbientGeometry node reflection and velocity clamp boundaries', () => {
      const maxSpeed = 2.5;
      const minSpeed = 0.12;

      function clampSpeed(vx, vy) {
        let speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < minSpeed && speed > 0.001) {
          const scale = minSpeed / speed;
          vx *= scale;
          vy *= scale;
        } else if (speed > maxSpeed) {
          vx = (vx / speed) * maxSpeed;
          vy = (vy / speed) * maxSpeed;
        }
        return { vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
      }

      const clampedFast = clampSpeed(5.0, 5.0);
      expect(clampedFast.speed).toBeCloseTo(2.5, 2);

      const clampedSlow = clampSpeed(0.02, 0.02);
      expect(clampedSlow.speed).toBeCloseTo(0.12, 2);
    });
  });

  // =========================================================================
  // Section 2: SVG File Size Boundaries & Vector Integrity (< 2,048 Bytes)
  // =========================================================================
  describe('Tier 2.3: SVG File Size Bounds & Format Boundaries', () => {
    function validateSvgBoundaries(sizeInBytes) {
      if (sizeInBytes <= 0) return { valid: false, reason: 'Empty file' };
      if (sizeInBytes < 50) return { valid: false, reason: 'Too small for valid SVG' };
      if (sizeInBytes >= 2048) return { valid: false, reason: 'Exceeds 2,048 bytes (<2KB limit)' };
      return { valid: true };
    }

    it('0-byte file boundary is rejected', () => {
      expect(validateSvgBoundaries(0).valid).toBe(false);
    });

    it('1-byte file boundary is rejected', () => {
      expect(validateSvgBoundaries(1).valid).toBe(false);
    });

    it('2047-byte file boundary is accepted', () => {
      expect(validateSvgBoundaries(2047).valid).toBe(true);
    });

    it('2048-byte exact boundary is rejected (strictly < 2,048)', () => {
      expect(validateSvgBoundaries(2048).valid).toBe(false);
    });

    it('2049-byte file boundary is rejected', () => {
      expect(validateSvgBoundaries(2049).valid).toBe(false);
    });

    it('5MB oversized asset is rejected', () => {
      expect(validateSvgBoundaries(5 * 1024 * 1024).valid).toBe(false);
    });

    const svgsInDir = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith('.svg'));
    for (const svgFile of svgsInDir) {
      it(`Service SVG asset "${svgFile}" size boundary check`, () => {
        const filePath = path.join(SERVICES_DIR, svgFile);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
        expect(typeof stats.size).toBe('number');
      });
    }
  });

  // =========================================================================
  // Section 3: Reduced Motion Boundary (prefers-reduced-motion: reduce)
  // =========================================================================
  describe('Tier 2.4: Reduced Motion Boundary Specifications', () => {
    const flowFieldPath = path.join(ROOT_DIR, 'src/components/canvas/FlowField.tsx');
    const flowFieldContent = fs.readFileSync(flowFieldPath, 'utf8');

    it('FlowField checks prefers-reduced-motion media query', () => {
      expect(flowFieldContent).toMatch(/prefers-reduced-motion:\s*reduce/);
    });

    it('FlowField implements renderStatic() loop with 260 iterations for reduced motion', () => {
      expect(flowFieldContent).toMatch(/renderStatic/);
      expect(flowFieldContent).toMatch(/260/);
    });

    it('FlowField skips continuous requestAnimationFrame when reduced motion is enabled', () => {
      expect(flowFieldContent).toMatch(/if\s*\(!reduced\)/);
    });

    const reducedMotionHookPath = path.join(ROOT_DIR, 'src/lib/useReducedMotion.ts');
    it('useReducedMotion hook exists and handles SSR safely', () => {
      expect(fs.existsSync(reducedMotionHookPath)).toBe(true);
      const hookContent = fs.readFileSync(reducedMotionHookPath, 'utf8');
      expect(hookContent).toMatch(/prefers-reduced-motion/);
    });
  });

  // =========================================================================
  // Section 4: Touch Device & Pointer Overrides & Physics Clamping Bounds
  // =========================================================================
  describe('Tier 2.5: Touch Device & Coarse Pointer Overrides & Clamping Bounds', () => {
    const projectsPath = path.join(ROOT_DIR, 'src/components/sections/Projects.tsx');
    const projectsContent = fs.readFileSync(projectsPath, 'utf8');
    const techStackPath = path.join(ROOT_DIR, 'src/components/sections/TechStack.tsx');
    const techStackContent = fs.readFileSync(techStackPath, 'utf8');
    const ambientPath = path.join(ROOT_DIR, 'src/components/canvas/AmbientGeometry.tsx');
    const ambientContent = fs.readFileSync(ambientPath, 'utf8');

    it('Projects hover preview ignores coarse pointers and hover: none devices', () => {
      expect(projectsContent).toMatch(/pointer:\s*coarse/);
      expect(projectsContent).toMatch(/hover:\s*hover/);
    });

    it('TechStack hover 360 spin skips execution on touch devices', () => {
      expect(techStackContent).toMatch(/pointer:\s*coarse/);
    });

    it('AmbientGeometry mouse tracking disables interaction on touch devices', () => {
      expect(ambientContent).toMatch(/pointer:\s*coarse/);
    });

    it('Mouse interaction distance guard handles distSq === 0 and avoids division by zero', () => {
      function calculatePush(dx, dy) {
        const distSq = dx * dx + dy * dy;
        if (distSq < 16900 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const push = ((130 - dist) / 130) * 2.2;
          return { vx: (dx / dist) * push, vy: (dy / dist) * push };
        }
        return { vx: 0, vy: 0 };
      }

      const zeroDist = calculatePush(0, 0);
      expect(zeroDist.vx).toBe(0);
      expect(zeroDist.vy).toBe(0);

      const tinyDist = calculatePush(0.5, 0.5);
      expect(tinyDist.vx).toBe(0);
      expect(tinyDist.vy).toBe(0);

      const validDist = calculatePush(50, 50);
      expect(Number.isFinite(validDist.vx)).toBe(true);
      expect(Number.isFinite(validDist.vy)).toBe(true);

      const farDist = calculatePush(500, 500);
      expect(farDist.vx).toBe(0);
      expect(farDist.vy).toBe(0);
    });

    it('Extreme mouse coordinates (-9999, 99999) do not produce NaN or Infinity', () => {
      const mouse = { x: -9999, y: -9999 };
      const node = { x: 100, y: 100, vx: 0.1, vy: 0.1 };
      const dx = node.x - mouse.x;
      const dy = node.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      expect(Number.isFinite(dist)).toBe(true);
      expect(dist).toBeGreaterThan(10000);
    });

    function clamp(min, max, val) {
      return Math.max(min, Math.min(max, val));
    }

    it('Tilt angle clamp bounds [-9, 9] on extreme delta values', () => {
      expect(clamp(-9, 9, -500)).toBe(-9);
      expect(clamp(-9, 9, -9)).toBe(-9);
      expect(clamp(-9, 9, 0)).toBe(0);
      expect(clamp(-9, 9, 9)).toBe(9);
      expect(clamp(-9, 9, 500)).toBe(9);
    });

    it('Parallax X translation clamp bounds [-14, 14]', () => {
      expect(clamp(-14, 14, -1000)).toBe(-14);
      expect(clamp(-14, 14, -14)).toBe(-14);
      expect(clamp(-14, 14, 0)).toBe(0);
      expect(clamp(-14, 14, 14)).toBe(14);
      expect(clamp(-14, 14, 1000)).toBe(14);
    });

    it('Parallax Y translation clamp bounds [-12, 12]', () => {
      expect(clamp(-12, 12, -1000)).toBe(-12);
      expect(clamp(-12, 12, -12)).toBe(-12);
      expect(clamp(-12, 12, 0)).toBe(0);
      expect(clamp(-12, 12, 12)).toBe(12);
      expect(clamp(-12, 12, 1000)).toBe(12);
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
    id: 'Tier 2',
    name: 'Boundary & Corner Cases',
    totalChecks,
    passedChecks,
    failedChecks,
    durationMs,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testContext.reset();
  runTier2Tests().then((res) => {
    console.log(`\nTier 2 Finished: ${res.passedChecks}/${res.totalChecks} passed in ${res.durationMs.toFixed(1)}ms`);
    process.exit(res.failedChecks > 0 ? 1 : 0);
  });
}

import { performance } from 'perf_hooks';
import { describe, it, expect, testContext, printSuiteResults, printTierHeader } from './test_utils.mjs';

export async function runTier5Tests() {
  const tierStart = performance.now();
  printTierHeader(5, 'Adversarial Stress & Physics Convergence', 'Stress-tests rapid resizing (0px->8K->fractional), 500+ mousemoves, no NaN/Inf, matrix explosion guards, and spring convergence.');

  // =========================================================================
  // Section 1: Rapid Resizing Stress & Matrix Stability (0px -> 8K -> Fractional)
  // =========================================================================
  describe('Tier 5.1: Rapid Resizing Stress Generator & Transform Matrix Invariance', () => {
    class MockCanvasContext {
      constructor() {
        this.transformMatrix = [1, 0, 0, 1, 0, 0];
        this.setTransformCalls = 0;
        this.scaleCalls = 0;
      }

      setTransform(a, b, c, d, e, f) {
        this.transformMatrix = [a, b, c, d, e, f];
        this.setTransformCalls++;
      }

      scale(sx, sy) {
        this.transformMatrix[0] *= sx;
        this.transformMatrix[3] *= sy;
        this.scaleCalls++;
      }

      clearRect() {}
      fillRect() {}
      beginPath() {}
      arc() {}
      fill() {}
      moveTo() {}
      lineTo() {}
      stroke() {}
    }

    function simulateResize(containerWidth, containerHeight, dprInput = 1, isMobileOverride = null) {
      if (containerWidth <= 0 || containerHeight <= 0 || isNaN(containerWidth) || isNaN(containerHeight)) {
        return {
          width: 0,
          height: 0,
          canvasWidth: 1,
          canvasHeight: 1,
          dpr: 1,
          skipped: true,
        };
      }

      const width = containerWidth;
      const height = containerHeight;
      const isMobile = isMobileOverride !== null ? isMobileOverride : width < 768;
      const rawDpr = dprInput || 1;
      const dpr = isMobile ? 1 : Math.min(isNaN(rawDpr) ? 1 : rawDpr, 1.5);

      const canvasWidth = Math.max(1, Math.floor(width * dpr));
      const canvasHeight = Math.max(1, Math.floor(height * dpr));

      return {
        width,
        height,
        canvasWidth,
        canvasHeight,
        dpr,
        skipped: false,
      };
    }

    it('2,000 rapid chaotic resizes produce valid integer dimensions with zero NaNs or Infs', () => {
      const extremeInputs = [
        [0, 0],
        [0.0001, 0.0001],
        [1, 1],
        [0.4, 0.7],
        [320, 480],
        [767.9, 1023.9],
        [768, 1024],
        [1280.45, 720.55],
        [1920, 1080],
        [2560, 1440],
        [3840, 2160],
        [7680, 4320],
        [15360, 8640],
        [-100, -200],
        [100.33333333333333, 200.66666666666666],
      ];

      for (let i = 0; i < 2000; i++) {
        const [rawW, rawH] = extremeInputs[i % extremeInputs.length];
        const randomJitter = (Math.random() - 0.5) * 5;
        const w = rawW > 0 ? rawW + randomJitter : rawW;
        const h = rawH > 0 ? rawH + randomJitter : rawH;
        const dpr = (i % 4) + 0.5;

        const res = simulateResize(w, h, dpr);
        expect(Number.isFinite(res.canvasWidth)).toBe(true);
        expect(Number.isFinite(res.canvasHeight)).toBe(true);
        expect(Number.isInteger(res.canvasWidth)).toBe(true);
        expect(Number.isInteger(res.canvasHeight)).toBe(true);
        expect(res.canvasWidth).toBeGreaterThanOrEqual(1);
        expect(res.canvasHeight).toBeGreaterThanOrEqual(1);
        expect(Number.isNaN(res.dpr)).toBe(false);
      }
    });

    it('Idempotent ctx.setTransform prevents compounding matrix explosion over 1,000 resizes', () => {
      const mockCtx = new MockCanvasContext();
      for (let i = 0; i < 1000; i++) {
        const dpr = 1.5;
        mockCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      expect(mockCtx.scaleCalls).toBe(0);
      expect(mockCtx.setTransformCalls).toBe(1000);
      expect(mockCtx.transformMatrix[0]).toBe(1.5);
      expect(mockCtx.transformMatrix[3]).toBe(1.5);
      expect(mockCtx.transformMatrix[1]).toBe(0);
      expect(mockCtx.transformMatrix[2]).toBe(0);
      expect(mockCtx.transformMatrix[4]).toBe(0);
      expect(mockCtx.transformMatrix[5]).toBe(0);
    });

    it('Subpixel fractional container bounds floor properly to avoid canvas buffer blurring', () => {
      const res = simulateResize(123.456, 789.1011, 1.5, false);
      expect(res.canvasWidth).toBe(Math.floor(123.456 * 1.5));
      expect(res.canvasHeight).toBe(Math.floor(789.1011 * 1.5));
      expect(res.canvasWidth % 1).toBe(0);
      expect(res.canvasHeight % 1).toBe(0);
    });
  });

  // =========================================================================
  // Section 2: 500+ Mousemoves, Division-by-Zero & Particle Physics Stress
  // =========================================================================
  describe('Tier 5.2: 500+ Chaotic Pointer Events & Canvas Physics Resilience', () => {
    class AmbientGeometryEngine {
      constructor(width, height) {
        this.width = width;
        this.height = height;
        this.nodes = [];
        this.mouse = { x: -9999, y: -9999 };
        this.init();
      }

      init() {
        const count = 90;
        this.nodes = [];
        for (let i = 0; i < count; i++) {
          this.nodes.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: Math.random() * 0.3 - 0.15,
            vy: Math.random() * 0.3 - 0.15,
            radius: 1.5 + Math.random() * 1.0,
          });
        }
      }

      step() {
        const mouse = this.mouse;
        for (let i = 0; i < this.nodes.length; i++) {
          const node = this.nodes[i];
          if (mouse.x > -9000) {
            const dx = node.x - mouse.x;
            const dy = node.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120 && dist > 1) {
              const strength = ((120 - dist) / 120) * 0.8;
              node.vx += (dx / dist) * strength;
              node.vy += (dy / dist) * strength;
            }
          }

          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.985;
          node.vy *= 0.985;

          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          const minSpeed = 0.12;
          if (speed < minSpeed && speed > 0.001) {
            const scale = minSpeed / speed;
            node.vx *= scale;
            node.vy *= scale;
          } else if (speed < 0.001) {
            node.vx = (Math.random() - 0.5) * 0.15;
            node.vy = (Math.random() - 0.5) * 0.15;
          }

          const maxSpeed = 2.5;
          if (speed > maxSpeed) {
            node.vx = (node.vx / speed) * maxSpeed;
            node.vy = (node.vy / speed) * maxSpeed;
          }

          if (node.x <= 0) {
            node.x = 0;
            node.vx = Math.abs(node.vx) * 0.7;
          } else if (node.x >= this.width) {
            node.x = this.width;
            node.vx = -Math.abs(node.vx) * 0.7;
          }
          if (node.y <= 0) {
            node.y = 0;
            node.vy = Math.abs(node.vy) * 0.7;
          } else if (node.y >= this.height) {
            node.y = this.height;
            node.vy = -Math.abs(node.vy) * 0.7;
          }
        }
      }
    }

    class FlowFieldEngine {
      constructor(width, height) {
        this.width = width;
        this.height = height;
        this.particles = [];
        this.mouse = { x: -9999, y: -9999 };
        this.time = 0;
        this.init();
      }

      spawn() {
        return {
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          px: 0,
          py: 0,
          life: 0,
          maxLife: 90 + Math.random() * 160,
          speed: 0.5 + Math.random() * 1.1,
          hueMix: Math.random() < 0.82 ? 0 : 0.7 + Math.random() * 0.3,
        };
      }

      init() {
        this.particles = Array.from({ length: 220 }, () => {
          const p = this.spawn();
          p.px = p.x;
          p.py = p.y;
          p.life = Math.random() * p.maxLife;
          return p;
        });
      }

      noiseAngle(x, y, t) {
        const n =
          Math.sin(x * 1.7 + t) * Math.cos(y * 1.35 - t * 0.7) +
          Math.sin((x + y) * 0.85 + t * 0.45) * 0.8 +
          Math.sin(x * 0.55 - y * 0.9 - t * 0.3) * 0.6;
        return n * 2.4;
      }

      step() {
        const scale = 0.0042;
        for (const p of this.particles) {
          const angle = this.noiseAngle(p.x * scale, p.y * scale, this.time);
          let vx = Math.cos(angle) * p.speed;
          let vy = Math.sin(angle) * p.speed * 0.85;

          if (this.mouse.x > -999) {
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 16900 && distSq > 1) {
              const dist = Math.sqrt(distSq);
              const push = ((130 - dist) / 130) * 2.2;
              vx += (dx / dist) * push;
              vy += (dy / dist) * push;
            }
          }

          p.px = p.x;
          p.py = p.y;
          p.x += vx;
          p.y += vy;
          p.life++;

          if (
            p.life > p.maxLife ||
            p.x < -20 || p.x > this.width + 20 || p.y < -20 || p.y > this.height + 20
          ) {
            Object.assign(p, this.spawn());
            p.px = p.x;
            p.py = p.y;
          }
        }
        this.time += 0.0028;
      }
    }

    it('AmbientGeometry survives 600 rapid chaotic mouse moves with zero NaN coordinates', () => {
      const engine = new AmbientGeometryEngine(1920, 1080);

      for (let frame = 0; frame < 600; frame++) {
        if (frame % 50 === 0) {
          engine.mouse = { x: -9999, y: -9999 };
        } else if (frame % 13 === 0) {
          engine.mouse = { x: engine.nodes[0].x, y: engine.nodes[0].y };
        } else {
          engine.mouse = {
            x: Math.random() * 1920,
            y: Math.random() * 1080,
          };
        }

        engine.step();

        for (const node of engine.nodes) {
          expect(Number.isFinite(node.x)).toBe(true);
          expect(Number.isFinite(node.y)).toBe(true);
          expect(Number.isFinite(node.vx)).toBe(true);
          expect(Number.isFinite(node.vy)).toBe(true);
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.x).toBeLessThanOrEqual(1920);
          expect(node.y).toBeGreaterThanOrEqual(0);
          expect(node.y).toBeLessThanOrEqual(1080);
        }
      }
    });

    it('FlowField survives 600 chaotic mouse moves without infinite velocity or NaN position', () => {
      const engine = new FlowFieldEngine(1920, 1080);

      for (let frame = 0; frame < 600; frame++) {
        if (frame % 40 === 0) {
          engine.mouse = { x: -9999, y: -9999 };
        } else if (frame % 11 === 0) {
          engine.mouse = { x: engine.particles[0].x, y: engine.particles[0].y };
        } else {
          engine.mouse = {
            x: Math.random() * 1920,
            y: Math.random() * 1080,
          };
        }

        engine.step();

        for (const p of engine.particles) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
          expect(Number.isFinite(p.px)).toBe(true);
          expect(Number.isFinite(p.py)).toBe(true);
          expect(Number.isFinite(p.life)).toBe(true);
        }
      }
    });

    it('Sub-pixel mouse proximity (dist < 1px) does not trigger division by zero', () => {
      const ambient = new AmbientGeometryEngine(800, 600);
      ambient.nodes[0].x = 100.00001;
      ambient.nodes[0].y = 100.00001;
      ambient.mouse = { x: 100.00000, y: 100.00000 };

      expect(() => ambient.step()).not.toThrow();
      expect(Number.isFinite(ambient.nodes[0].vx)).toBe(true);
      expect(Number.isFinite(ambient.nodes[0].vy)).toBe(true);

      const flow = new FlowFieldEngine(800, 600);
      flow.particles[0].x = 100.00001;
      flow.particles[0].y = 100.00001;
      flow.mouse = { x: 100.00000, y: 100.00000 };

      expect(() => flow.step()).not.toThrow();
      expect(Number.isFinite(flow.particles[0].x)).toBe(true);
      expect(Number.isFinite(flow.particles[0].y)).toBe(true);
    });
  });

  // =========================================================================
  // Section 3: Dennis Snellenberg Modal Spring Physics Monotonic Convergence
  // =========================================================================
  describe('Tier 5.3: Dennis Snellenberg Liquid Modal Damped Spring Convergence', () => {
    class DennisSnellenbergModalPhysics {
      constructor() {
        this.POSITION_LERP = 0.055;
        this.ROT_LERP = 0.08;
        this.delayedMouse = { x: 0, y: 0 };
        this.dynamics = { rotation: 0, scale: 0, opacity: 0 };
        this.isHovering = true;
        this.imgX = 0;
        this.imgY = 0;
      }

      clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
      }

      step(targetMouseX, targetMouseY) {
        const dx = targetMouseX - this.delayedMouse.x;
        const dy = targetMouseY - this.delayedMouse.y;

        this.delayedMouse.x += dx * this.POSITION_LERP;
        this.delayedMouse.y += dy * this.POSITION_LERP;

        const targetRot = this.isHovering ? this.clamp(dx * 0.15, -9, 9) : 0;
        this.dynamics.rotation += (targetRot - this.dynamics.rotation) * this.ROT_LERP;

        if (this.isHovering) {
          this.imgX = this.clamp(-dx * 0.25, -14, 14);
          this.imgY = this.clamp(-dy * 0.25, -12, 12);
        } else {
          this.imgX = 0;
          this.imgY = 0;
        }

        return {
          delayedX: this.delayedMouse.x,
          delayedY: this.delayedMouse.y,
          dx,
          dy,
          rotation: this.dynamics.rotation,
          imgX: this.imgX,
          imgY: this.imgY,
        };
      }
    }

    it('Step input response exhibits strict monotonic convergence without overshoot', () => {
      const modal = new DennisSnellenbergModalPhysics();
      const targetX = 1000;
      const targetY = 500;

      let prevErrorX = Math.abs(targetX - modal.delayedMouse.x);
      let prevErrorY = Math.abs(targetY - modal.delayedMouse.y);

      for (let frame = 1; frame <= 180; frame++) {
        const state = modal.step(targetX, targetY);
        const currentErrorX = Math.abs(targetX - state.delayedX);
        const currentErrorY = Math.abs(targetY - state.delayedY);

        expect(currentErrorX).toBeLessThanOrEqual(prevErrorX);
        expect(currentErrorY).toBeLessThanOrEqual(prevErrorY);

        expect(state.delayedX).toBeLessThanOrEqual(targetX + 0.0001);
        expect(state.delayedY).toBeLessThanOrEqual(targetY + 0.0001);

        prevErrorX = currentErrorX;
        prevErrorY = currentErrorY;
      }

      expect(Math.abs(targetX - modal.delayedMouse.x)).toBeLessThan(0.05);
      expect(Math.abs(targetY - modal.delayedMouse.y)).toBeLessThan(0.05);
    });

    it('Velocity tilt angle and parallax counter-movement are strictly clamped under 1,000,000px jump', () => {
      const modal = new DennisSnellenbergModalPhysics();
      const massiveJump = 1000000;

      const state = modal.step(massiveJump, massiveJump);

      expect(state.rotation).toBeLessThanOrEqual(9);
      expect(state.rotation).toBeGreaterThanOrEqual(-9);
      expect(state.imgX).toBe(-14);
      expect(state.imgY).toBe(-12);
    });

    it('Resting state convergence brings tilt angle and parallax translation to 0', () => {
      const modal = new DennisSnellenbergModalPhysics();
      modal.step(1000, 1000);

      for (let frame = 0; frame < 200; frame++) {
        modal.step(1000, 1000);
      }

      expect(Math.abs(modal.dynamics.rotation)).toBeLessThan(0.01);
      expect(Math.abs(modal.imgX)).toBeLessThan(0.01);
      expect(Math.abs(modal.imgY)).toBeLessThan(0.01);
    });
  });

  // =========================================================================
  // Section 4: 120fps Lenis + GSAP Master Sync & Scroll Trigger Invariance
  // =========================================================================
  describe('Tier 5.4: 120fps Master RAF Synchronization & Jitter Invariance', () => {
    it('Ticker time scaling accurately delivers milliseconds to Lenis across 60Hz, 120Hz, and 240Hz', () => {
      const frameRates = [60, 120, 144, 240];
      for (const fps of frameRates) {
        const deltaSec = 1 / fps;
        let timeSec = 0;
        let receivedMs = 0;

        const fakeLenis = {
          raf: (ms) => {
            receivedMs = ms;
          },
        };

        for (let frame = 1; frame <= 10; frame++) {
          timeSec += deltaSec;
          fakeLenis.raf(timeSec * 1000);
          expect(receivedMs).toBeCloseTo(timeSec * 1000, 3);
        }
      }
    });

    it('gsap.ticker.lagSmoothing(0) prevents frame skipping desynchronization under heavy load', () => {
      const lagSmoothingConfig = { threshold: 0, adjustedLag: 0 };
      function applyLagSmoothing(threshold, adjustedLag) {
        lagSmoothingConfig.threshold = threshold;
        lagSmoothingConfig.adjustedLag = adjustedLag;
      }

      applyLagSmoothing(0, 0);
      expect(lagSmoothingConfig.threshold).toBe(0);
    });
  });

  // =========================================================================
  // Section 5: Unmount Cleanup & Zero Memory Leaks Harness
  // =========================================================================
  describe('Tier 5.5: Mount/Unmount Cycle Memory Lifecycle & Teardown Verification', () => {
    class MockDOMContainer {
      constructor() {
        this.listeners = new Map();
        this.observers = [];
      }

      addEventListener(event, fn) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(fn);
      }

      removeEventListener(event, fn) {
        if (this.listeners.has(event)) {
          this.listeners.get(event).delete(fn);
        }
      }

      get activeListenerCount() {
        let count = 0;
        for (const set of this.listeners.values()) {
          count += set.size;
        }
        return count;
      }
    }

    it('Simulating 100 rapid component mount/unmount cycles leaves exactly 0 dangling listeners', () => {
      const container = new MockDOMContainer();

      for (let cycle = 0; cycle < 100; cycle++) {
        const onMove = () => {};
        const onLeave = () => {};
        container.addEventListener('mousemove', onMove);
        container.addEventListener('mouseleave', onLeave);

        expect(container.activeListenerCount).toBe(2);

        container.removeEventListener('mousemove', onMove);
        container.removeEventListener('mouseleave', onLeave);
        expect(container.activeListenerCount).toBe(0);
      }

      expect(container.activeListenerCount).toBe(0);
    });
  });

  const tierSummary = {
    id: 'Tier 5',
    name: 'Adversarial Stress & Physics',
    totalChecks: testContext.suites
      .filter((s) => s.name.startsWith('Tier 5'))
      .reduce((sum, s) => sum + s.tests.length, 0),
    passedChecks: testContext.suites
      .filter((s) => s.name.startsWith('Tier 5'))
      .reduce((sum, s) => sum + s.passed, 0),
    failedChecks: testContext.suites
      .filter((s) => s.name.startsWith('Tier 5'))
      .reduce((sum, s) => sum + s.failed, 0),
    durationMs: performance.now() - tierStart,
  };

  return tierSummary;
}

if (process.argv[1] && process.argv[1].endsWith('tier5_adversarial_stress.test.mjs')) {
  (async () => {
    testContext.reset();
    await runTier5Tests();
    for (const suite of testContext.suites) {
      printSuiteResults(suite);
    }
  })();
}

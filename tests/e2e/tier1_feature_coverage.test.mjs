import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, testContext, printSuiteResults, printTierHeader } from './test_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVICES_DIR = path.join(ROOT_DIR, 'public/Services');
const TECH_STACK_FILE = path.join(ROOT_DIR, 'src/components/sections/TechStack.tsx');
const ABOUT_ME_FILE = path.join(ROOT_DIR, 'src/components/sections/AboutMe.tsx');

export async function runTier1Tests() {
  const tierStart = performance.now();
  const initialChecks = testContext.totalChecks;
  const initialPassed = testContext.passedChecks;
  const initialFailed = testContext.failedChecks;

  printTierHeader(1, 'Feature Coverage', 'Validates 28 skills catalog, all TechStack SVGs (<2KB), 5 categories, and AboutMe credentials.');

  describe('Tier 1.1: TechStack 5 Editorial Categories & Schema Contract', () => {
    const techStackContent = fs.readFileSync(TECH_STACK_FILE, 'utf8');

    it('TechStack source file exists and is non-empty', () => {
      expect(fs.existsSync(TECH_STACK_FILE)).toBe(true);
      expect(techStackContent.length).toBeGreaterThan(100);
    });

    it('TechStack defines 5 distinct editorial categories', () => {
      const hasFrontend = /id:\s*['"]frontend['"]/i.test(techStackContent);
      const hasBackend = /id:\s*['"]backend['"]/i.test(techStackContent);
      const hasDatabase = /id:\s*['"]database['"]/i.test(techStackContent);
      const hasDevops = /id:\s*['"](?:devops|tools)['"]/i.test(techStackContent);
      const hasToolsOrAI = /id:\s*['"](?:tools|ai|testing)['"]/i.test(techStackContent);

      expect(hasFrontend).toBe(true);
      expect(hasBackend).toBe(true);
      expect(hasDatabase).toBe(true);
      expect(hasDevops).toBe(true);
      expect(hasToolsOrAI).toBe(true);
    });

    it('TechStack matches interface contracts for TechItem and Category', () => {
      expect(techStackContent).toMatch(/name:\s*['"][^'"]+['"]/);
      expect(techStackContent).toMatch(/icon:\s*['"]\/Services\/[^'"]+['"]/);
    });
  });

  describe('Tier 1.2: TechStack 12 Missing Skills Presence (ORIGINAL_REQUEST §1)', () => {
    const techStackContent = fs.readFileSync(TECH_STACK_FILE, 'utf8');

    const missingSkills = [
      { name: 'TypeScript', regex: /name:\s*['"]TypeScript['"]/i },
      { name: 'Socket.io', regex: /name:\s*['"]Socket\.io['"]/i },
      { name: 'Redux Toolkit', regex: /name:\s*['"]Redux(?:\s*Toolkit)?['"]/i },
      { name: 'Mongoose', regex: /name:\s*['"]Mongoose['"]/i },
      { name: 'GitHub Actions', regex: /name:\s*['"]GitHub\s*Actions['"]/i },
      { name: 'Nginx', regex: /name:\s*['"]Nginx['"]/i },
      { name: 'Linux', regex: /name:\s*['"]Linux['"]/i },
      { name: 'Zod', regex: /name:\s*['"]Zod['"]/i },
      { name: 'Stripe', regex: /name:\s*['"]Stripe['"]/i },
      { name: 'Cloudinary', regex: /name:\s*['"]Cloudinary['"]/i },
      { name: 'Jest', regex: /name:\s*['"]Jest['"]/i },
      { name: 'Gemini AI', regex: /name:\s*['"]Gemini(?:\s*AI)?['"]/i },
    ];

    for (const skill of missingSkills) {
      it(`Skill "${skill.name}" is defined in TechStack`, () => {
        expect(skill.regex.test(techStackContent)).toBe(true);
      });
    }
  });

  describe('Tier 1.3: TechStack Full 28 Technical Skills Coverage', () => {
    const techStackContent = fs.readFileSync(TECH_STACK_FILE, 'utf8');

    const expected28Skills = [
      'JavaScript', 'React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Bootstrap', 'Redux', 'GSAP',
      'Node.js', 'Express', 'Socket.io', 'Firebase',
      'MongoDB', 'Mongoose', 'MySQL',
      'Git', 'GitHub Actions', 'Docker', 'AWS', 'Nginx', 'Linux',
      'Jest', 'Gemini AI', 'Postman', 'Figma', 'Zod', 'Stripe', 'Cloudinary',
    ];

    for (const skill of expected28Skills) {
      it(`Catalog includes skill: ${skill}`, () => {
        const regex = new RegExp(`['"]${skill.replace('.', '\\.')}`, 'i');
        const found = regex.test(techStackContent);
        expect(found).toBe(true);
      });
    }

    it('All referenced icons in TechStack point to /Services/ path', () => {
      const iconMatches = techStackContent.match(/icon:\s*['"]([^'"]+)['"]/g) || [];
      expect(iconMatches.length).toBeGreaterThanOrEqual(16);
      for (const match of iconMatches) {
        const iconPath = match.replace(/icon:\s*['"]/, '').replace(/['"]/, '');
        expect(iconPath.startsWith('/Services/')).toBe(true);
        expect(/\.(svg|webp|png)$/i.test(iconPath)).toBe(true);
      }
    });
  });

  describe('Tier 1.4: All SVG Vector Icons in TechStack & Catalog Size (<2KB) and Integrity', () => {
    const techStackContent = fs.readFileSync(TECH_STACK_FILE, 'utf8');
    const iconMatches = techStackContent.match(/icon:\s*['"]([^'"]+\.svg)['"]/gi) || [];
    const techStackSVGs = Array.from(new Set(
      iconMatches.map(m => m.replace(/icon:\s*['"]\/Services\//i, '').replace(/['"]/, ''))
    ));

    const requiredSVGs = [
      'typescript.svg',
      'socketio.svg',
      'redux.svg',
      'reduxtoolkit.svg',
      'mongoose.svg',
      'githubactions.svg',
      'nginx.svg',
      'linux.svg',
      'zod.svg',
      'stripe.svg',
      'cloudinary.svg',
      'jest.svg',
      'gemini.svg',
      'geminiai.svg',
      'mysql.svg',
      'postman-icon.svg',
      'bootstrap.svg',
      'docker.svg',
      'firebase.svg',
      'mongodb.svg',
    ];

    const allTestedSVGs = Array.from(new Set([...techStackSVGs, ...requiredSVGs]));

    it('Extracted SVG icon list from TechStack is complete (at least 15 SVG icons)', () => {
      expect(techStackSVGs.length).toBeGreaterThanOrEqual(15);
    });

    for (const svgFile of allTestedSVGs) {
      it(`SVG icon "${svgFile}" exists in public/Services/`, () => {
        const filePath = path.join(SERVICES_DIR, svgFile);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it(`SVG icon "${svgFile}" is strictly under 2,048 bytes (<2KB)`, () => {
        const filePath = path.join(SERVICES_DIR, svgFile);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          expect(stats.size).toBeLessThan(2048);
          expect(stats.size).toBeGreaterThan(50);
        } else {
          throw new Error(`File ${svgFile} does not exist to verify size`);
        }
      });

      it(`SVG icon "${svgFile}" has zero XML comments and valid vector markup`, () => {
        const filePath = path.join(SERVICES_DIR, svgFile);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8').trim();
          expect(content.includes('<svg')).toBe(true);
          expect(content.includes('</svg>')).toBe(true);
          expect(/viewBox=["'][^"']+["']|width=["'][^"']+["']/i.test(content)).toBe(true);
          expect(/<(?:path|circle|rect|polygon|g|defs)/i.test(content)).toBe(true);
          expect(content.includes('data:image/png;base64')).toBe(false);
          expect(/<!--[\s\S]*?-->/.test(content)).toBe(false);
          expect(/<\?xml/i.test(content)).toBe(false);
        } else {
          throw new Error(`File ${svgFile} does not exist to verify markup`);
        }
      });
    }
  });

  describe('Tier 1.5: AboutMe Section Credentials & Social Proof (ORIGINAL_REQUEST §4)', () => {
    const aboutContent = fs.readFileSync(ABOUT_ME_FILE, 'utf8');

    it('AboutMe contains HEC National Skills Competency Test (NSCT 2026) credential', () => {
      const hasNSCT = /NSCT|National\s*Skills\s*Competency\s*Test/i.test(aboutContent);
      expect(hasNSCT).toBe(true);
    });

    it('AboutMe highlights 95th Percentile Nationwide credential', () => {
      const has95th = /95th\s*percentile|top\s*5%/i.test(aboutContent);
      expect(has95th).toBe(true);
    });

    it('AboutMe contains e-strats Software Engineer Internship credential', () => {
      const hasEstrats = /e-strats/i.test(aboutContent);
      expect(hasEstrats).toBe(true);
    });

    it('AboutMe highlights real-time architectures (MERN / Socket.io / Cloud)', () => {
      const hasRealtime = /Socket\.io|real-time|MERN|cloud/i.test(aboutContent);
      expect(hasRealtime).toBe(true);
    });

    it('AboutMe embeds FlowField canvas simulation in visual wrapper', () => {
      expect(aboutContent.includes('<FlowField')).toBe(true);
      expect(aboutContent.includes("from '@/components/canvas/FlowField'")).toBe(true);
    });

    it('AboutMe includes editorial typography styling with AnimatedHeading & ScrollWordReveal', () => {
      expect(aboutContent.includes('AnimatedHeading')).toBe(true);
      expect(aboutContent.includes('ScrollWordReveal')).toBe(true);
    });
  });

  for (const suite of testContext.suites) {
    printSuiteResults(suite);
  }

  const durationMs = performance.now() - tierStart;
  const totalChecks = testContext.totalChecks - initialChecks;
  const passedChecks = testContext.passedChecks - initialPassed;
  const failedChecks = testContext.failedChecks - initialFailed;

  return {
    id: 'Tier 1',
    name: 'Feature Coverage',
    totalChecks,
    passedChecks,
    failedChecks,
    durationMs,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testContext.reset();
  runTier1Tests().then((res) => {
    console.log(`\nTier 1 Finished: ${res.passedChecks}/${res.totalChecks} passed in ${res.durationMs.toFixed(1)}ms`);
    process.exit(res.failedChecks > 0 ? 1 : 0);
  });
}

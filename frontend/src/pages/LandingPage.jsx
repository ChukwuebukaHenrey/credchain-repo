import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ShieldCheck, Search, Zap, ArrowRight, GraduationCap, Building2, Briefcase, Shield,
  BadgeCheck, Wallet, Clock, FileCheck, Globe, Coins, Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import Badge from '../components/ui/Badge';
import { fadeUp, stagger, staggerItem } from '../theme/motion';

const STATS = [
  { value: '6,843', label: 'Students Verified' },
  { value: '₦42M+', label: 'Earned by Students' },
  { value: '$0.00', label: 'Gas per Credential*' },
  { value: '<1s', label: 'Employer Search Speed' },
];

const HOW = [
  { icon: GraduationCap, title: 'Issue', copy: 'Universities & bootcamps mint verified credentials straight to a student — the day results confirm.', color: '#6366F1' },
  { icon: ShieldCheck, title: 'Anchor on Solana', copy: 'Each credential is SHA-256 hashed and anchored on-chain via the SPL Memo program. Immutable, instant, near-zero cost.', color: '#8B5CF6' },
  { icon: Search, title: 'Verify & get hired', copy: 'Employers search by skill, tier & CredScore, verify in <1s, and pay on Solana — no transcript delay, no fraud.', color: '#10B981' },
];

const PORTALS = [
  { icon: GraduationCap, title: 'For Students', copy: 'Verify skills, build a CredScore, get found, and earn before you graduate.', to: '/register?role=student', cta: 'Start earning', tone: 'brand' },
  { icon: Building2, title: 'For Issuers', copy: 'Mint tamper-proof credentials. No transcript delay. Instant employer reach.', to: '/register?role=issuer', cta: 'Become an issuer', tone: 'violet' },
  { icon: Briefcase, title: 'For Employers', copy: 'Search 6,843 verified profiles. Hire and pay on Solana in under a second.', to: '/register?role=employer', cta: 'Search talent', tone: 'success' },
];

const PROBLEMS = [
  { icon: Clock, bad: '6–12 month transcript delay', good: 'Instant on-chain Statement of Result' },
  { icon: Wallet, bad: 'International payment rejected', good: 'SOL to any wallet in under 1 second' },
  { icon: FileCheck, bad: 'PDF certificate nobody verifies', good: 'SHA-256 anchored, verifiable anywhere' },
  { icon: Shield, bad: 'NYSC mobilization errors', good: 'NYSC pre-validation tracker in-app' },
  { icon: Coins, bad: 'No income until after graduation', good: 'Earn from year one — skill is the application' },
  { icon: Search, bad: 'Employers can’t find you', good: 'Searchable talent profile from day one' },
];

function Reveal({ children, delay = 0, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingCredential() {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 18 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className="relative mx-auto w-full max-w-sm"
    >
      <div className="animate-floaty rounded-2xl border border-white/15 bg-gradient-to-br from-brand-600 to-violet-600 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Verified Credential</span>
          <BadgeCheck className="h-6 w-6" />
        </div>
        <h3 className="mt-6 text-2xl font-bold">React.js — Practitioner</h3>
        <p className="mt-1 text-sm text-white/70">University of Nigeria · 2026</p>
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
          <ShieldCheck className="h-4 w-4 text-accent-400" />
          <code className="font-mono text-xs text-white/90">tx 3xK9…m2Pw · anchored</code>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-white/70">
          <span>CredScore impact</span>
          <span className="font-bold text-accent-400">+120</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
        className="absolute -right-4 -top-4 flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1.5 text-xs font-bold text-white shadow-verified"
      >
        <ShieldCheck className="h-4 w-4" /> Verified ✓
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div className="min-h-screen bg-bg-base text-content-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="text-xl font-black tracking-tight">
            <span className="text-brand-600">Cred</span>Chain
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/registry" className="hidden text-sm font-medium text-content-secondary transition-colors hover:text-content-primary sm:inline">Registry</Link>
            <Link to="/impact" className="hidden text-sm font-medium text-content-secondary transition-colors hover:text-content-primary sm:inline">Impact</Link>
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>Get started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden bg-grad-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <motion.div style={{ y: heroY }} variants={stagger(0.08)} initial="initial" animate="animate">
            <motion.div variants={staggerItem}>
              <Badge tone="brand" variant="soft" dot icon={<Sparkles />}>Built on Solana · For students in school right now</Badge>
            </motion.div>
            <motion.h1 variants={staggerItem} className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Don’t wait to graduate{' '}
              <span className="bg-gradient-to-r from-brand-600 via-violet-500 to-accent-500 bg-clip-text text-transparent">
                to prove what you can do.
              </span>
            </motion.h1>
            <motion.p variants={staggerItem} className="mt-5 max-w-xl text-lg leading-relaxed text-content-secondary">
              A student verifies a skill on CredChain. An employer searches <em>“Node.js Practitioner”</em> and finds them.
              They earn ₦250,000 before exams. The credential is on Solana. The payment is real.
            </motion.p>
            <motion.div variants={staggerItem} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register?role=student"><Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>Start building my record</Button></Link>
              <Link to="/register?role=employer"><Button size="lg" variant="outline">I’m hiring verified talent</Button></Link>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <FloatingCredential />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border-subtle bg-bg-elevated">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="text-center">
              <p className="tnum text-3xl font-black tracking-tight text-content-primary md:text-4xl">{s.value}</p>
              <p className="mt-1 text-xs text-content-secondary">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">From class to found to paid</h2>
          <p className="mx-auto mt-3 max-w-xl text-content-secondary">Every step verifiable. Every step on-chain.</p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {HOW.map((step, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="group relative h-full rounded-2xl border border-border-subtle bg-bg-elevated p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: step.color }}>
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-bold text-content-muted">STEP {i + 1}</span>
                </div>
                <h3 className="mt-1 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">{step.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Portals */}
      <section className="bg-bg-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">One network. Three doors.</h2>
            <p className="mx-auto mt-3 max-w-xl text-content-secondary">Everyone with skill and no proof.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PORTALS.map((p, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <Link to={p.to} className="group block h-full">
                  <div className="relative h-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-base p-7 transition-all hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-brand">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-600 transition-transform group-hover:scale-110">
                      <p.icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-content-secondary">{p.copy}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                      {p.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Problems solved */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Six problems. <span className="text-brand-600">All solved.</span></h2>
          <p className="mt-3 text-content-secondary">Nigeria first. Every emerging market next.</p>
        </Reveal>
        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {PROBLEMS.map((p, i) => (
            <Reveal key={i} delay={(i % 2) * 0.08}>
              <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-600">
                  <p.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </span>
                <div>
                  <p className="text-sm text-content-muted line-through">{p.bad}</p>
                  <p className="mt-0.5 text-sm font-semibold text-content-primary">→ {p.good}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why Solana */}
      <section className="relative overflow-hidden bg-grad-brand">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center text-white">
          <Reveal>
            <Globe className="mx-auto h-10 w-10 opacity-90" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/80">Why Solana</p>
            <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight md:text-3xl">
              10,000 credentials on Ethereum: thousands in gas.
              <br />On Solana via state compression: <span className="text-accent-400">under $2 total.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              A micro-task worth ₦80,000 is pointless with $20 gas fees. On Solana it’s a fraction of a cent —
              the difference between a product that exists and one that doesn’t.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Your proof of skill shouldn’t wait four years.</h2>
          <p className="mx-auto mt-3 max-w-xl text-content-secondary">
            Start in year one. Build while you study. Graduate with a verified record that does all the talking.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register?role=student"><Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>Start building my record</Button></Link>
            <Link to="/register?role=employer"><Button size="lg" variant="outline">I’m hiring verified talent</Button></Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-bg-elevated">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-content-muted md:flex-row">
          <span><span className="font-bold text-content-secondary">Cred</span>Chain — Trust infrastructure for the global skill economy</span>
          <div className="flex gap-5">
            <Link to="/registry" className="transition-colors hover:text-content-primary">Issuer Registry</Link>
            <Link to="/impact" className="transition-colors hover:text-content-primary">Equity Impact</Link>
            <Link to="/verify/student/demo" className="transition-colors hover:text-content-primary">Verify a Credential</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { CitationNetwork } from '@/components/NeuralBackground';
import { GooglyEyes } from '@/components/GooglyEyes';
import { Search, MessageSquare, LayoutGrid, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'hsl(218, 23%, 41%)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <GooglyEyes />
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'hsl(220,15%,65%)' }}>
            <a href="#discover" className="transition-colors" style={{ color: 'inherit' }} onMouseEnter={e => (e.currentTarget.style.color='#fff')} onMouseLeave={e => (e.currentTarget.style.color='')}>Discover</a>
            <a href="#understand" className="transition-colors" style={{ color: 'inherit' }} onMouseEnter={e => (e.currentTarget.style.color='#fff')} onMouseLeave={e => (e.currentTarget.style.color='')}>Understand</a>
            <a href="#compare" className="transition-colors" style={{ color: 'inherit' }} onMouseEnter={e => (e.currentTarget.style.color='#fff')} onMouseLeave={e => (e.currentTarget.style.color='')}>Compare</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm transition-colors hidden md:block"
              style={{ color: 'hsl(221, 21%, 71%)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color='#fff')}
              onMouseLeave={e => (e.currentTarget.style.color='hsl(220, 2%, 39%)')}
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-primary-foreground px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity font-medium"
              style={{ background: 'hsl(345,40%,52%)' }}
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-14 min-h-[88vh] flex items-center">
        <div className="max-w-5xl mx-auto px-6 w-full">
          <div className="flex flex-col md:flex-row items-center gap-12 py-16">
            <div className="flex-1 min-w-0 animate-fade-in-up">
              <p className="text-sm font-semibold text-foreground tracking-tight mb-1">citeCraft</p>
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-8 opacity-80">Academic Research Tool</p>
              <h1 className="text-5xl md:text-6xl font-semibold leading-tight text-foreground mb-3 tracking-tight">
                Read less.
              </h1>
              <h1
                className="text-5xl md:text-6xl leading-tight mb-8"
                style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: 'hsl(345,40%,52%)' }}
              >
                Understand more.
              </h1>
              <p className="text-base text-muted-foreground max-w-md leading-relaxed mb-10">
                citeCraft helps researchers discover papers, extract answers, and compare findings without spending hours reading.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-6 py-3 rounded-md hover:opacity-90 transition-opacity group"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-0 w-full" style={{ height: 420 }}>
              <CitationNetwork />
            </div>
          </div>
        </div>
      </section>

      {/* CORE ACTIONS */}
      <section id="discover" className="py-28 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-16">What you can do</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-5">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Discover papers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Search across multiple academic databases. Export citations in any format. Download results. No tab-switching.
              </p>
            </div>
            <div id="understand">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-5">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Understand papers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask questions, get answers grounded in actual paper sections. Have a full conversation with a paper — context preserved throughout.
              </p>
            </div>
            <div id="compare">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-5">
                <LayoutGrid className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">Compare papers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Side-by-side comparison across methods, results, and datasets. Every comparison backed by source evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-24 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-16">Why researchers use citeCraft</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10 max-w-3xl">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Hours saved per survey</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Stop skimming 40 abstracts manually. Find what's relevant in minutes.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Answers from the paper, not the internet</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Every response is grounded in actual paper text, with section references.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Structured comparison, not mental overhead</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Compare 5 papers on methodology in one view instead of five browser tabs.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Your library, always organized</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Collections keep everything grouped. Upload PDFs. Resume where you left off.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-4 tracking-tight">Ready to start?</h2>
          <p className="text-sm text-muted-foreground mb-8">No credit card required. Works on any browser.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-8 py-3 rounded-md hover:opacity-90 transition-opacity group"
          >
            Get started for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">citeCraft</span>
          <span className="text-xs text-muted-foreground">© 2025 citeCraft. Built for researchers.</span>
        </div>
      </footer>

    </div>
  );
}
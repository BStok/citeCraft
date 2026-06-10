import { CitationNetwork } from '@/components/NeuralBackground';
import { GooglyEyes } from '@/components/GooglyEyes';
import { Search, MessageSquare, LayoutGrid, ArrowRight, Zap } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm" style={{ background: 'hsla(225, 71%, 48%, 0.03)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <GooglyEyes />
          <nav className="hidden md:flex items-center gap-10 text-sm" style={{ color: 'hsl(220, 20%, 6%)' }}>
            <a href="#discover" className="transition-colors hover:text-white duration-200">Discover</a>
            <a href="#how-it-works" className="transition-colors hover:text-white duration-200">How it works</a>
            <a href="#understand" className="transition-colors hover:text-white duration-200">Understand</a>
            <a href="#compare" className="transition-colors hover:text-white duration-200">Compare</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm transition-colors hidden md:block"
              style={{ color: 'hsl(359, 40%, 28%)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color='#623636')}
              onMouseLeave={e => (e.currentTarget.style.color='hsl(210, 2%, 20%)')}
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
      <section className="pt-20 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          background: 'radial-gradient(ellipse at 100% 0%, hsl(345,40%,52%) 0%, transparent 50%)'
        }}></div>
        
        <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-16 py-20">
            <div className="flex-1 min-w-0">
                            
              <h1 className="text-6xl md:text-7xl font-bold leading-tight text-foreground mb-4 tracking-tight">
                Ask questions to research papers
              </h1>
              
              <p className="text-2xl md:text-3xl leading-tight mb-8" style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: 'hsl(345,40%,52%)' }}>
                and get cited answers instantly.
              </p>
              
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed mb-12 font-light">
                citeCraft helps you find papers, ask questions, and compare findings without reading everything line by line. Cut your research time from hours to minutes.
              </p>
              
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-7 py-3.5 rounded-lg hover:opacity-90 transition-all duration-200 group shadow-lg hover:shadow-xl"
                  style={{ background: 'hsl(345,40%,52%)' }}
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 w-full" style={{ height: 480 }}>
              <CitationNetwork />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-32 border-t border-border relative">
        <div className="absolute inset-x-0 top-0 h-32" style={{
          background: 'linear-gradient(to bottom, hsl(218, 23%, 41%, 0.05), transparent)'
        }}></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="mb-20">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(345,40%,52%)' }}>PROCESS</span>
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mt-3 mb-4 leading-tight">
              Three steps to better research
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl font-light">
              From search to comparison, we've streamlined every step so you spend time analyzing .
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* STEP 1 */}
            <div className="group relative">
              <div className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: 'linear-gradient(135deg, hsl(345,40%,52%, 0.1), hsl(220,15%,65%, 0.1))',
              }}></div>
              
              <div className="relative bg-card rounded-xl border border-border p-8 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg h-full flex flex-col">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-6" style={{ background: 'hsl(345,40%,52%, 0.15)' }}>
                  <span className="text-xl font-bold" style={{ color: 'hsl(345,40%,52%)' }}>1</span>
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3">Find papers instantly</h3>
                
                <p className="text-base text-muted-foreground leading-relaxed mb-6 flex-grow font-light">
                  Search any topic and get papers with PDFs and metadata in one place. No tab switching, no endless scrolling through databases.
                </p>
                
                <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(345,40%,52%)' }}>
                  <Search className="w-4 h-4" />
                  <span className="font-medium">Instant search</span>
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="group relative">
              <div className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: 'linear-gradient(135deg, hsl(345,40%,52%, 0.1), hsl(220,15%,65%, 0.1))',
              }}></div>
              
              <div className="relative bg-card rounded-xl border border-border p-8 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg h-full flex flex-col">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-6" style={{ background: 'hsl(345,40%,52%, 0.15)' }}>
                  <span className="text-xl font-bold" style={{ color: 'hsl(345,40%,52%)' }}>2</span>
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3">Ask and understand</h3>
                
                <p className="text-base text-muted-foreground leading-relaxed mb-6 flex-grow font-light">
                  Ask questions and get answers directly from the paper, with cited sources. Have a full conversation with your research context preserved.
                </p>
                
                <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(345,40%,52%)' }}>
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">Cited answers</span>
                </div>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="group relative">
              <div className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: 'linear-gradient(135deg, hsl(345,40%,52%, 0.1), hsl(220,15%,65%, 0.1))',
              }}></div>
              
              <div className="relative bg-card rounded-xl border border-border p-8 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg h-full flex flex-col">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-6" style={{ background: 'hsl(345,40%,52%, 0.15)' }}>
                  <span className="text-xl font-bold" style={{ color: 'hsl(345,40%,52%)' }}>3</span>
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3">Compare and organize</h3>
                
                <p className="text-base text-muted-foreground leading-relaxed mb-6 flex-grow font-light">
                  Compare up to 5 papers side-by-side and save them into your own collections. Track patterns across research effortlessly.
                </p>
                
                <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(345,40%,52%)' }}>
                  <LayoutGrid className="w-4 h-4" />
                  <span className="font-medium">Smart comparison</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE ACTIONS */}
      <section id="discover" className="py-32 border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(345,40%,52%)' }}>CAPABILITIES</span>
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mt-3 leading-tight">
              Everything researchers need
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" style={{ color: 'hsl(345,40%,52%)' }} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Find relevant papers instantly</h3>
              <p className="text-base text-muted-foreground leading-relaxed font-light">
                Search across sources, download PDFs, and access structured metadata without switching tabs.
              </p>
            </div>
            
            <div id="understand" className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" style={{ color: 'hsl(345,40%,52%)' }} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Get answers without reading everything</h3>
              <p className="text-base text-muted-foreground leading-relaxed font-light">
                Ask questions, get answers grounded in actual paper sections with citations. Have a full conversation with a paper — context preserved throughout.
              </p>
            </div>
            
            <div id="compare" className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-primary" style={{ color: 'hsl(345,40%,52%)' }} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Compare research in one view</h3>
              <p className="text-base text-muted-foreground leading-relaxed font-light">
                Analyze up to 5 papers across methods, results, and datasets all backed by source evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-32 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'hsl(345,40%,52%)' }}>WHY CHOOSE citeCraft</span>
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mt-3 leading-tight">
              Built for serious researchers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 max-w-4xl">
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-foreground">Cut literature review time from hours to minutes</h4>
              <p className="text-base text-muted-foreground leading-relaxed font-light">Stop skimming 40 abstracts manually. Find what's relevant in minutes.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-foreground">Answers with exact citations from the paper</h4>
              <p className="text-base text-muted-foreground leading-relaxed font-light">Every response is grounded in actual paper text, with section references.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-foreground">Structured comparison, not mental overhead</h4>
              <p className="text-base text-muted-foreground leading-relaxed font-light">Compare 5 papers on methodology in one view instead of five browser tabs.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-foreground">Build and manage your personal research library</h4>
              <p className="text-base text-muted-foreground leading-relaxed font-light">Collections keep everything grouped. Upload PDFs. Resume where you left off.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 border-t border-border relative">
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(ellipse at 50% 100%, hsl(345,40%,52%, 0.15), transparent 60%)'
        }}></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Ready to transform your research?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 font-light">
            Join researchers accelerating their academic work. No credit card required.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-primary-foreground text-base font-semibold px-8 py-4 rounded-lg hover:opacity-90 transition-all duration-200 group shadow-lg hover:shadow-xl"
            style={{ background: 'hsl(345,40%,52%)' }}
          >
            Get started for free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-base font-bold text-foreground">citeCraft</span>
          <span className="text-sm text-muted-foreground">© 2025 citeCraft. Built for researchers.</span>
        </div>
      </footer>
    </div>
  );
}

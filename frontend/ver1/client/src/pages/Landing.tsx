import { ArrowRight, Zap, Microscope, Lightbulb } from 'lucide-react';
import { useLocation } from 'wouter';
import { useState, useEffect, CSSProperties } from 'react';

interface Feature {
  num: string;
  title: string;
  desc: string;
}

interface Benefit {
  icon: string;
  title: string;
  desc: string;
}

interface Stat {
  value: string;
  label: string;
}

const FEATURES: Feature[] = [
  {
    num: '01',
    title: 'Discover',
    desc: 'Search 50M+ papers. Elegant filtering. One interface.'
  },
  {
    num: '02',
    title: 'Understand',
    desc: 'Ask questions. Get cited answers. Pure intelligence.'
  },
  {
    num: '03',
    title: 'Compare',
    desc: '5 papers at once. Patterns emerge. Clarity wins.'
  },
  {
    num: '04',
    title: 'Organize',
    desc: 'Collections that scale. Your research library, perfected.'
  }
];

const STATS: Stat[] = [
  { value: '50M+', label: 'Papers Indexed' },
  { value: '10K+', label: 'Active Researchers' }
];

const BENEFITS: Benefit[] = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'Hours to minutes. Real-time results.' },
  { icon: '✓', title: 'Always Cited', desc: 'Every answer backed by papers.' },
  { icon: '◆', title: 'Beautifully Designed', desc: 'Delight in every interaction.' },
  { icon: '∞', title: 'Scale Your Work', desc: 'Collections. Organization. Control.' }
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    background: '#fafaf7',
    color: '#1a1a18'
  };

  const headerStyle: CSSProperties = {
    background: scrollY > 50 ? 'rgba(250, 250, 247, 0.95)' : 'rgba(250, 250, 247, 0)',
    backdropFilter: scrollY > 50 ? 'blur(12px)' : 'none',
    borderBottom: scrollY > 50 ? '1px solid rgba(184, 134, 11, 0.1)' : 'transparent'
  };

  const logoBoxStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const featureCardStyle: CSSProperties = {
    position: 'relative',
    border: '1px solid rgba(184, 134, 11, 0.2)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(250,250,247,0.8) 100%)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.5s cubic-bezier(0.23, 1, 0.320, 1)',
    cursor: 'pointer',
    borderRadius: '8px'
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Sohne:wght@400;600;700&display=swap');

        * {
          font-family: 'Sohne', system-ui, sans-serif;
        }

        h1, h2, h3 {
          font-family: 'Playfair Display', serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }

        .slide-in-left {
          animation: slideInLeft 0.8s ease-out forwards;
          opacity: 0;
        }

        .slide-in-right {
          animation: slideInRight 0.8s ease-out forwards;
          opacity: 0;
        }

        .gentle-float {
          animation: gentle-float 4s ease-in-out infinite;
        }

        .art-deco-line::after {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 0;
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #b8860b 0%, transparent 100%);
        }

        .feature-card {
          position: relative;
          transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1);
          border: 1px solid rgba(184, 134, 11, 0.2);
          background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(250,250,247,0.8) 100%);
          backdrop-filter: blur(10px);
        }

        .feature-card:hover {
          border-color: rgba(184, 134, 11, 0.6);
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
          box-shadow: 0 20px 60px rgba(26, 26, 24, 0.08);
          transform: translateY(-4px);
        }

        .accent {
          color: #b8860b;
        }

        .subtle-glow {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(26, 26, 24, 0.04);
        }

        button {
          transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
        }

        button:hover {
          transform: translateY(-2px);
        }

        button:active {
          transform: translateY(0px);
        }

        .nav-link {
          position: relative;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #666;
          transition: color 0.3s ease;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: #b8860b;
          transition: width 0.3s ease;
        }

        .nav-link:hover {
          color: #1a1a18;
        }

        .nav-link:hover::after {
          width: 100%;
        }
      `}</style>

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={headerStyle}>
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div style={logoBoxStyle}>
              <Zap className="w-5 h-5" style={{ color: '#fafaf7' }} strokeWidth={3} />
            </div>
            <span style={{
              fontSize: '18px',
              fontWeight: '700',
              letterSpacing: '1px',
              color: '#1a1a18'
            }}>CITECRAFT</span>
          </div>

          <nav className="hidden lg:flex items-center gap-12">
            {['Discover', 'Features', 'How it works'].map((link, i) => (
              <a key={i} href={`#${link.toLowerCase()}`} className="nav-link">
                {link}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '8px 16px'
            }} onMouseEnter={(e) => (e.currentTarget.style.color = '#1a1a18')}
               onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}>
              Sign in
            </button>
            <button onClick={() => navigate('/login')} style={{
              background: '#b8860b',
              color: '#fafaf7',
              border: 'none',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              borderRadius: '2px'
            }} onMouseEnter={(e) => (e.currentTarget.style.background = '#8b6914')}
               onMouseLeave={(e) => (e.currentTarget.style.background = '#b8860b')}>
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ paddingTop: '140px', paddingBottom: '120px', position: 'relative', overflow: 'hidden' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Left */}
            <div className="space-y-8">
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#b8860b'
              }} className="fade-in-up">
                <div style={{ width: '8px', height: '8px', background: '#b8860b', borderRadius: '50%' }}></div>
                Research, Elevated
              </div>

              <h1 style={{
                fontSize: '56px',
                lineHeight: '1.15',
                fontWeight: '900',
                letterSpacing: '-0.02em',
                color: '#1a1a18'
              }} className="fade-in-up">
                The Research
                <br/>
                <span className="accent">Platform</span>
                <br/>
                That Thinks.
              </h1>

              <p style={{
                fontSize: '18px',
                lineHeight: '1.7',
                color: '#666',
                maxWidth: '480px'
              }} className="fade-in-up">
                Literature review from hours to minutes. Search 50M+ papers. Get cited answers. Compare intelligently. Organize perfectly.
              </p>

              <div className="flex items-center gap-4 pt-4 fade-in-up">
                <button onClick={() => navigate('/login')} style={{
                  background: '#b8860b',
                  color: '#fafaf7',
                  border: 'none',
                  padding: '14px 32px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  borderRadius: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px'
                }} onMouseEnter={(e) => (e.currentTarget.style.background = '#8b6914')}
                   onMouseLeave={(e) => (e.currentTarget.style.background = '#b8860b')}>
                  Explore Now
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </button>
                <span style={{ fontSize: '13px', color: '#999', fontWeight: '600' }}>
                  No credit card needed
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
                paddingTop: '32px',
                borderTop: '1px solid rgba(184, 134, 11, 0.1)'
              }} className="fade-in-up">
                {STATS.map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1a1a18' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', fontWeight: '600', marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Feature showcase */}
            <div className="slide-in-right">
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafaf7 100%)',
                border: '1px solid rgba(184, 134, 11, 0.2)',
                borderRadius: '12px',
                padding: '40px',
                aspectRatio: '1'
              }} className="subtle-glow">
                {/* Art deco decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-1px',
                  left: '0',
                  right: '0',
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #b8860b, transparent)',
                  borderRadius: '3px'
                }}></div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.1) 0%, rgba(184, 134, 11, 0.05) 100%)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '24px'
                    }}>
                      <Microscope style={{ width: '28px', height: '28px', color: '#b8860b' }} />
                    </div>
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1a1a18',
                      marginBottom: '12px',
                      lineHeight: '1.3'
                    }}>
                      Intelligent Search
                    </h3>
                    <p style={{ fontSize: '15px', color: '#999', lineHeight: '1.6' }}>
                      Find exactly what you need from 50M+ papers. Smart filtering. Instant results.
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '24px',
                    borderTop: '1px solid rgba(184, 134, 11, 0.1)'
                  }}>
                    <div style={{ fontSize: '13px', color: '#666', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '16px' }}>
                      Key Features
                    </div>
                    <ul style={{ fontSize: '14px', color: '#999', lineHeight: '2' }}>
                      <li>✓ Full-text search</li>
                      <li>✓ PDF download</li>
                      <li>✓ Metadata included</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={{
        paddingTop: '120px',
        paddingBottom: '120px',
        borderTop: '1px solid rgba(184, 134, 11, 0.1)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(184, 134, 11, 0.02) 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-24">
            <div style={{
              display: 'inline-block',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#b8860b',
              marginBottom: '16px'
            }} className="fade-in-up">
              The Platform
            </div>
            <h2 style={{
              fontSize: '48px',
              fontWeight: '900',
              letterSpacing: '-0.02em',
              color: '#1a1a18',
              marginBottom: '16px',
              lineHeight: '1.2'
            }} className="fade-in-up">
              Four pillars of
              <br/>
              <span className="accent">research excellence.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="feature-card p-8 fade-in-up"
                style={{
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: 'rgba(184, 134, 11, 0.2)',
                  marginBottom: '16px'
                }}>
                  {feat.num}
                </div>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#1a1a18',
                  marginBottom: '12px'
                }}>
                  {feat.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#999',
                  lineHeight: '1.7'
                }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section style={{
        paddingTop: '120px',
        paddingBottom: '120px',
        borderTop: '1px solid rgba(184, 134, 11, 0.1)'
      }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="slide-in-left">
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #fafaf7 100%)',
                border: '1px solid rgba(184, 134, 11, 0.2)',
                borderRadius: '12px',
                padding: '60px 40px',
                textAlign: 'center',
                position: 'relative',
                aspectRatio: '1'
              }} className="subtle-glow gentle-float">
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.15) 0%, rgba(184, 134, 11, 0.05) 100%)',
                  borderRadius: '12px',
                  margin: '0 auto 24px'
                }}>
                  <Lightbulb style={{ width: '44px', height: '44px', color: '#b8860b' }} />
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1a1a18',
                  marginBottom: '8px'
                }}>
                  AI-Powered
                </h3>
                <p style={{ color: '#999', fontSize: '14px' }}>
                  Answers grounded in actual papers
                </p>
              </div>
            </div>

            <div className="slide-in-right">
              <h2 style={{
                fontSize: '48px',
                fontWeight: '900',
                letterSpacing: '-0.02em',
                color: '#1a1a18',
                marginBottom: '24px',
                lineHeight: '1.2'
              }} className="art-deco-line">
                Why researchers
                <br/>
                <span className="accent">choose citeCraft.</span>
              </h2>

              <div className="space-y-6">
                {BENEFITS.map((benefit, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px' }} className="fade-in-up">
                    <div style={{
                      fontSize: '24px',
                      minWidth: '32px',
                      color: '#b8860b'
                    }}>
                      {benefit.icon}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#1a1a18',
                        marginBottom: '4px'
                      }}>
                        {benefit.title}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#999'
                      }}>
                        {benefit.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{
        paddingTop: '120px',
        paddingBottom: '120px',
        borderTop: '1px solid rgba(184, 134, 11, 0.1)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(184, 134, 11, 0.03) 100%)'
      }}>
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 style={{
            fontSize: '52px',
            fontWeight: '900',
            letterSpacing: '-0.02em',
            color: '#1a1a18',
            marginBottom: '24px',
            lineHeight: '1.2'
          }} className="fade-in-up">
            Ready to transform
            <br/>
            <span className="accent">your research?</span>
          </h2>

          <p style={{
            fontSize: '18px',
            color: '#666',
            maxWidth: '500px',
            margin: '0 auto 32px',
            lineHeight: '1.7'
          }} className="fade-in-up">
            Join researchers who've reduced their lit review time by 80%. Start free today.
          </p>

          <button onClick={() => navigate('/login')} style={{
            background: '#b8860b',
            color: '#fafaf7',
            border: 'none',
            padding: '16px 40px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            borderRadius: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px'
          }} className="fade-in-up"
             onMouseEnter={(e) => (e.currentTarget.style.background = '#8b6914')}
             onMouseLeave={(e) => (e.currentTarget.style.background = '#b8860b')}>
            Get Started Free
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        paddingTop: '60px',
        paddingBottom: '60px',
        borderTop: '1px solid rgba(184, 134, 11, 0.1)',
        color: '#999'
      }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div style={{
              width: '24px',
              height: '24px',
              background: '#b8860b',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap className="w-3.5 h-3.5" style={{ color: '#fafaf7' }} strokeWidth={3} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a18', letterSpacing: '0.5px' }}>
              CITECRAFT
            </span>
          </div>
          <span style={{ fontSize: '13px' }}>
            © 2025. Transforming academic research.
          </span>
        </div>
      </footer>
    </div>
  );
}
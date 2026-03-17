import React, { useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, 
  Hospital, 
  Pill, 
  Activity, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  ClipboardList,
  MapPin,
  Clock,
  Menu,
  ChevronRight,
  Sparkles
} from 'lucide-react';

/* --- Components --- */

const Nav = () => (
  <nav className="nav-floating">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Activity color="var(--accent-teal)" size={24} />
      <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>MedBridge</span>
    </div>
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <a href="#features" style={{ textDecoration: 'none', color: 'var(--text-muted-dark)', fontSize: '0.9rem' }}>Features</a>
      <a href="#portals" style={{ textDecoration: 'none', color: 'var(--text-muted-dark)', fontSize: '0.9rem' }}>Solutions</a>
      <a href="#" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '2rem' }}>Launch App</a>
    </div>
  </nav>
);

const BentoItem = ({ children, className, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className={`bento-item ${className}`}
  >
    {children}
  </motion.div>
);

const App = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef}>
      <Nav />
      
      {/* --- HERO SECTION (DARK) --- */}
      <section className="section section-dark hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="mesh-gradient" />
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity, textAlign: 'center', width: '100%' }}
          className="container"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}
          >
            <Sparkles size={16} color="var(--accent-teal)" />
            <span>The World's First Healthcare OS is here</span>
          </motion.div>
          <h1 className="hero-title">
            Healthcare <br /> Redefined.
          </h1>
          <p className="hero-subtitle">
            A unified ecosystem connecting patients, doctors, and hospitals through deep integration and AI-driven triage.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#" className="btn btn-primary">Start Your Journey <ArrowRight size={18} /></a>
            <a href="#" className="btn btn-outline">Explore Hospital Portal</a>
          </div>
        </motion.div>
      </section>

      {/* --- FEATURES SECTION (LIGHT) --- */}
      <section id="features" className="section section-light">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 style={{ maxWidth: '800px', margin: '0 auto 5rem' }}>Robust tools for a <span style={{ color: 'var(--accent-indigo)' }}>connected</span> medical world.</h2>
          </motion.div>

          <div className="bento-grid">
            <BentoItem className="large" delay={0.1} style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #fff 100%)' }}>
               <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                <Zap color="var(--accent-teal)" size={40} />
               </div>
               <h3 style={{ fontSize: '2rem', color: 'var(--text-dark)' }}>AI Triage Engine</h3>
               <p style={{ color: 'var(--text-muted-light)', fontSize: '1.1rem' }}>Claude-powered clinical intelligence that determines care levels with red-flag escalation.</p>
            </BentoItem>

            <BentoItem className="tall" delay={0.2} style={{ background: 'var(--bg-dark)', color: 'white' }}>
               <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                <ShieldCheck color="var(--accent-teal)" size={32} />
               </div>
               <h3 style={{ fontSize: '1.5rem' }}>Verified Directory</h3>
               <p style={{ color: 'var(--text-muted-dark)' }}>Outcome-weighted trust scores for every provider.</p>
            </BentoItem>

            <BentoItem className="wide" delay={0.3} style={{ background: '#eef2ff' }}>
               <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                <Pill color="var(--accent-indigo)" size={32} />
               </div>
               <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)' }}>Smart MedFinder</h3>
               <p style={{ color: 'var(--text-muted-light)' }}>Real-time stock tracking across verified pharmacy partners.</p>
            </BentoItem>

            <BentoItem delay={0.4}>
               <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)' }}>Live EMR</h3>
               <p style={{ color: 'var(--text-muted-light)', fontSize: '0.9rem' }}>Synced in real-time between app and clinic.</p>
            </BentoItem>
            
            <BentoItem delay={0.5}>
               <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)' }}>Lab Sync</h3>
               <p style={{ color: 'var(--text-muted-light)', fontSize: '0.9rem' }}>Instant results push notifications to patients.</p>
            </BentoItem>
          </div>
        </div>
      </section>

      {/* --- PORTALS SHOWCASE (DARK) --- */}
      <section id="portals" className="section section-dark">
        <div className="container">
           <div className="portals" style={{ gap: '8rem' }}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div style={{ color: 'var(--accent-teal)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase' }}>Consumer Portal</div>
                <h2 style={{ fontSize: '3.5rem', lineHeight: 1.1, marginBottom: '2rem' }}>Your health, <br /> simplified.</h2>
                <p style={{ color: 'var(--text-muted-dark)', fontSize: '1.2rem', marginBottom: '3rem' }}>
                  The MedBridge consumer app isn't just a booking tool. It's an intelligent companion that guides you from symptom to recovery.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem' }}>
                   <li style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div className="glass" style={{ padding: '0.5rem', borderRadius: '0.5rem' }}><Activity size={20} color="var(--accent-teal)" /></div>
                      <span>Intelligent Symptom Triage</span>
                   </li>
                   <li style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div className="glass" style={{ padding: '0.5rem', borderRadius: '0.5rem' }}><MapPin size={20} color="var(--accent-teal)" /></div>
                      <span>Proximity-based Medication Search</span>
                   </li>
                </ul>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="portal-preview glass"
                style={{ padding: '1rem', height: '500px' }}
              >
                <div className="glow" style={{ top: -50, right: -50 }} />
                <img src="/consumer-preview.png" alt="App UI" style={{ borderRadius: '1rem', opacity: 0.9 }} />
              </motion.div>
           </div>

           <div className="portals" style={{ direction: 'rtl', marginTop: '10rem', gap: '8rem' }}>
              <motion.div
                 initial={{ opacity: 0, x: 50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.8 }}
                 viewport={{ once: true }}
                 style={{ direction: 'ltr' }}
              >
                <div style={{ color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase' }}>Hospital OS</div>
                <h2 style={{ fontSize: '3.5rem', lineHeight: 1.1, marginBottom: '2rem' }}>Total Clinical <br /> Control.</h2>
                <p style={{ color: 'var(--text-muted-dark)', fontSize: '1.2rem', marginBottom: '3rem' }}>
                  Empower your staff with tools that actually work. A full-featured HMS built for speed, accuracy, and patient safety.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                   <div className="glass" style={{ padding: '1.5rem' }}>
                      <h4 style={{ color: 'var(--accent-teal)', marginBottom: '0.5rem' }}>Ward Mgmt</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)' }}>Live bed tracking and patient admission flows.</p>
                   </div>
                   <div className="glass" style={{ padding: '1.5rem' }}>
                      <h4 style={{ color: 'var(--accent-indigo)', marginBottom: '0.5rem' }}>Pharmacy</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)' }}>Inventory tracking with automated low-stock alerts.</p>
                   </div>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="portal-preview glass"
                style={{ direction: 'ltr', padding: '1rem', height: '500px' }}
              >
                <div className="glow" style={{ bottom: -50, left: -50, background: 'radial-gradient(circle, var(--accent-indigo) 0%, transparent 70%)' }} />
                <img src="/hero-image.png" alt="Dashboard UI" style={{ borderRadius: '1rem', opacity: 0.9 }} />
              </motion.div>
           </div>
        </div>
      </section>

      {/* --- CTA SECTION (LIGHT) --- */}
      <section className="section section-light" style={{ textAlign: 'center' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass"
            style={{ padding: '6rem 2rem', background: '#0f172a', color: 'white', borderRadius: '3rem', position: 'relative', overflow: 'hidden' }}
          >
            <div className="glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1 }} />
            <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', color: 'white' }}>Ready to bridge the gap?</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
              Join the future of integrated healthcare. Scale your clinic or manage your health with MedBridge.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
               <button className="btn btn-primary" style={{ padding: '1.25rem 3rem', fontSize: '1.1rem' }}>Create Account</button>
               <button className="btn glass" style={{ padding: '1.25rem 3rem', fontSize: '1.1rem', color: 'white' }}>Contact Sales</button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="section section-dark" style={{ padding: '4rem 0', borderTop: '1px solid var(--glass-border)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--accent-teal)" size={20} />
            <span style={{ fontWeight: 700 }}>MedBridge</span>
          </div>
          <p style={{ color: 'var(--text-muted-dark)', fontSize: '0.9rem' }}>© 2026 MedBridge OS. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '2rem' }}>
             <a href="#" style={{ color: 'var(--text-muted-dark)', textDecoration: 'none' }}>Privacy</a>
             <a href="#" style={{ color: 'var(--text-muted-dark)', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

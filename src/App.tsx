import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Navigation } from "./components/Navigation";
import { CustomCursor } from "./components/CustomCursor";
import { ParticleField } from "./components/ParticleField";
import { Hero } from "./sections/Hero";
import { About } from "./sections/About";
import { Works } from "./sections/Works";
import { Services } from "./sections/Services";
import { FAQ } from "./sections/FAQ";
import { Testimonials } from "./sections/Testimonials";
import { Pricing } from "./sections/Pricing";
import { Blog } from "./sections/Blog";
import { Contact } from "./sections/Contact";
import { Footer } from "./sections/Footer";
import { BlogPage } from "./pages/BlogPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { AdminPage } from "./pages/AdminPage";
import { siteConfig } from "./config";

gsap.registerPlugin(ScrollTrigger);

function HomePage() {
  useEffect(() => {
    if (siteConfig.title) document.title = siteConfig.title;
    if (siteConfig.language)
      document.documentElement.lang = siteConfig.language;
    const timer = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#080808] text-white overflow-x-hidden">
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Particle field */}
      <ParticleField />

      {/* Navigation */}
      <Navigation />

      {/* Main content */}
      <main>
        <Hero />
        <About />
        <Works />
        <Services />
        <FAQ />
        <Testimonials />
        <Pricing />
        <Blog />
        <Contact />
        <Footer />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

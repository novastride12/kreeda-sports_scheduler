import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LiveTicker from './components/LiveTicker';
import Home from './pages/Home';
import TournamentDetail from './pages/TournamentDetail';
import { Trophy } from 'lucide-react';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-obsidian-dark text-ivory-primary selection:bg-gold-primary selection:text-obsidian-dark font-sans">
          {/* Header & Navigation */}
          <Navbar />
          
          {/* Live Marquee Ticker */}
          <LiveTicker />

          {/* Main Content Arena */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tournament/:id" element={<TournamentDetail />} />
            </Routes>
          </main>

          {/* Premium Footer */}
          <footer className="border-t border-obsidian-light bg-obsidian-card py-6">
            <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8 space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-gold-primary font-sans font-semibold text-sm">
                <Trophy className="h-4 w-4" />
                <span>KREEDA STADIUM SYSTEM</span>
              </div>
              <p className="text-[10px] text-ivory-muted tracking-wider">
                © {new Date().getFullYear()} Kreeda Inc. All Rights Reserved. Securely Monitored & Orchestrated.
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

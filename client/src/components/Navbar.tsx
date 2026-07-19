import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, LogOut, LogIn, User, Lock, X, ShieldAlert } from 'lucide-react';

export const Navbar = () => {
  const { admin, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-obsidian-light bg-obsidian-dark/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2 group">
                <Trophy className="h-6 w-6 text-gold-primary transition-transform group-hover:scale-110" />
                <span className="text-xl font-extrabold tracking-wider text-ivory-primary font-sans group-hover:text-gold-primary transition-colors">
                  KREEDA
                </span>
              </a>
            </div>

            {/* Auth / Admin Status */}
            <div className="flex items-center gap-4">
              {admin ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold text-gold-primary flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-pulse" />
                      ADMIN SECURE
                    </span>
                    <span className="text-xs text-ivory-muted">logged as {admin.username}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 px-3 py-1.5 text-xs font-semibold text-crimson-primary hover:bg-crimson-primary/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gold-primary/20 bg-gold-primary/5 px-3 py-1.5 text-xs font-semibold text-gold-primary hover:bg-gold-primary/10 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Slide-in Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-obsidian-light bg-obsidian-card p-6 shadow-gold-glow relative">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setError('');
              }}
              className="absolute top-4 right-4 text-ivory-muted hover:text-ivory-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 text-center">
              <Trophy className="mx-auto h-8 w-8 text-gold-primary mb-2" />
              <h3 className="text-lg font-bold text-ivory-primary">Admin Control Center</h3>
              <p className="text-xs text-ivory-muted mt-1">Enter your credentials to manage brackets</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ivory-muted mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ivory-dark" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark py-2 pl-10 pr-4 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none transition-colors"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ivory-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ivory-dark" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark py-2 pl-10 pr-4 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 p-3 text-xs text-crimson-primary">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gold-primary py-2 text-sm font-semibold text-obsidian-dark hover:bg-gold-light focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
export default Navbar;

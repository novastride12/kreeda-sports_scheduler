import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trophy, Calendar, MapPin, X, ChevronRight, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tournament {
  _id: string;
  name: string;
  sports: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed';
  champions?: Array<{ sport: string; team: { _id: string; name: string } }>;
}

interface LiveMatch {
  _id: string;
  tournamentId: string;
  tournamentName: string;
  sport: string;
  roundName: string;
  matchIndex: number;
  team1: { _id: string; name: string; code?: string } | null;
  team2: { _id: string; name: string; code?: string } | null;
  team1Score: number;
  team2Score: number;
  status: 'live';
  venue?: string;
}

export const Home = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'live'>('tournaments');
  
  // Create Tournament modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [sportsInput, setSportsInput] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTournamentsAndLiveMatches = async () => {
    try {
      const response = await axios.get('/api/tournaments');
      const tourns = response.data;
      setTournaments(tourns);

      const allLive: LiveMatch[] = [];
      await Promise.all(
        tourns.map(async (t: Tournament) => {
          try {
            const matchesResponse = await axios.get(`/api/tournaments/${t._id}/matches`);
            const liveForTourn = matchesResponse.data.filter((m: any) => m.status === 'live');
            liveForTourn.forEach((m: any) => {
              allLive.push({ ...m, tournamentName: t.name });
            });
          } catch (err) {
            console.error(`Error loading matches for tournament ${t._id}:`, err);
          }
        })
      );
      setLiveMatches(allLive);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentsAndLiveMatches();

    const interval = setInterval(fetchTournamentsAndLiveMatches, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sportsInput) return;

    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/tournaments', {
        name,
        sports: sportsInput,
        description,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        venue,
      });
      setShowCreateModal(false);
      setName('');
      setSportsInput('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setVenue('');
      fetchTournamentsAndLiveMatches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create tournament.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center rounded-md bg-obsidian-light border border-ivory-dark/20 px-2 py-0.5 text-[10px] font-medium text-ivory-muted shadow-gold-glow">
            DRAFT
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center rounded-md bg-gold-primary/10 border border-gold-primary/30 px-2 py-0.5 text-[10px] font-medium text-gold-primary shadow-gold-glow">
            PUBLISHED
          </span>
        );
      case 'ongoing':
        return (
          <span className="inline-flex items-center rounded-md bg-crimson-primary/10 border border-crimson-primary/30 px-2 py-0.5 text-[10px] font-medium text-crimson-primary animate-pulse shadow-crimson-glow">
            LIVE / ONGOING
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            COMPLETED
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-obsidian-card to-obsidian-light border border-obsidian-light p-8 sm:p-12 mb-10 shadow-gold-glow">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-block px-2.5 py-1 text-[10px] font-bold text-gold-primary bg-gold-primary/10 border border-gold-primary/30 rounded-full uppercase tracking-widest mb-4 shadow-gold-glow">
            CHAMPIONSHIP STAGE
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ivory-primary sm:text-5xl font-sans mb-3 drop-shadow-md">
            Arena Tournaments
          </h1>
          <p className="text-ivory-muted text-base leading-relaxed mb-6">
            Welcome to Kreeda. Plan, seed, schedule and visualize single-elimination (knockout) brackets with professional live score progression and instant PDF updates across multiple sports.
          </p>
          
          {admin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-primary hover:bg-gold-light text-obsidian-dark px-4 py-2 text-sm font-bold shadow-gold-glow transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Tournament
            </button>
          )}
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-gold-primary/5 to-transparent pointer-events-none" />
      </section>

      {/* Tab Switcher */}
      <div className="border-b border-obsidian-light mb-8 flex justify-between items-center">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`whitespace-nowrap pb-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'tournaments'
                ? 'border-gold-primary text-gold-primary font-bold drop-shadow-md'
                : 'border-transparent text-ivory-muted hover:text-ivory-primary'
            }`}
          >
            All Tournaments
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`whitespace-nowrap pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'live'
                ? 'border-gold-primary text-gold-primary font-bold drop-shadow-md'
                : 'border-transparent text-ivory-muted hover:text-ivory-primary'
            }`}
          >
            <Flame className="h-4 w-4 text-crimson-primary animate-pulse" />
            Live Arena ({liveMatches.length})
          </button>
        </div>
        <span className="text-xs text-ivory-muted hidden sm:inline">
          {activeTab === 'tournaments' ? `${tournaments.length} tournament(s) available` : `${liveMatches.length} match(es) active`}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-gold-primary border-r-transparent border-b-transparent border-l-transparent" />
          <span className="text-xs text-ivory-muted mt-3">Loading arenas...</span>
        </div>
      ) : activeTab === 'tournaments' ? (
        /* TOURNAMENTS TAB */
        tournaments.length === 0 ? (
          <div className="text-center py-20 rounded-xl bg-obsidian-card border border-obsidian-light">
            <Trophy className="mx-auto h-12 w-12 text-ivory-dark mb-3" />
            <h3 className="text-base font-bold text-ivory-primary">No Tournaments Seeded</h3>
            <p className="text-xs text-ivory-muted mt-1 max-w-sm mx-auto">
              {admin ? "Click 'Create Tournament' above to kick off the championship bracket!" : "Check back later for active tournament schedules."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <div
                key={t._id}
                onClick={() => navigate(`/tournament/${t._id}`)}
                className="group cursor-pointer rounded-xl border border-obsidian-light bg-obsidian-card p-5 hover:border-gold-primary/30 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-gold-glow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {t.sports && t.sports.map((sport) => (
                        <span key={sport} className="text-[9px] font-bold text-gold-primary uppercase tracking-wider bg-gold-primary/5 px-2 py-0.5 border border-gold-primary/20 rounded shadow-gold-glow">
                          {sport}
                        </span>
                      ))}
                    </div>
                    {getStatusBadge(t.status)}
                  </div>

                  <h3 className="text-lg font-bold text-ivory-primary group-hover:text-gold-primary transition-colors line-clamp-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-ivory-muted line-clamp-2 mt-1.5 leading-relaxed">
                    {t.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-obsidian-light/50 flex flex-col gap-2">
                  {t.startDate && (
                    <div className="flex items-center gap-1.5 text-xs text-ivory-muted">
                      <Calendar className="h-3.5 w-3.5 text-ivory-dark" />
                      <span>
                        {new Date(t.startDate).toLocaleDateString()}
                        {t.endDate && ` - ${new Date(t.endDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                  {t.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-ivory-muted">
                      <MapPin className="h-3.5 w-3.5 text-ivory-dark" />
                      <span className="truncate">{t.venue}</span>
                    </div>
                  )}

                  {t.champions && t.champions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1.5 rounded-lg text-[10px] text-emerald-400 font-sans">
                      <span className="font-bold flex items-center gap-1 uppercase tracking-wider text-[9px] text-emerald-300">
                        <Trophy className="h-3 w-3 shrink-0" /> champions
                      </span>
                      {t.champions.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>{c.sport}:</span>
                          <span className="font-bold text-ivory-primary truncate">{c.team?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-right">
                    <span className="inline-flex items-center gap-0.5 text-xs text-gold-primary font-semibold group-hover:underline">
                      View Arena
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* LIVE ARENA FULL TAB */
        liveMatches.length === 0 ? (
          <div className="text-center py-20 rounded-xl bg-obsidian-card border border-obsidian-light">
            <Flame className="mx-auto h-12 w-12 text-ivory-dark mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-ivory-primary">No Active Live Matches</h3>
            <p className="text-xs text-ivory-muted mt-1 max-w-sm mx-auto">
              Check back later for active sport matches or updates on scheduled brackets.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {liveMatches.map((m) => (
              <div
                key={m._id}
                onClick={() => navigate(`/tournament/${m.tournamentId}`)}
                className="cursor-pointer rounded-xl border border-crimson-primary/30 bg-crimson-primary/5 p-6 hover:border-crimson-primary/60 transition-all duration-300 flex flex-col justify-between shadow-crimson-glow"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-crimson-primary/10 pb-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-ivory-muted uppercase tracking-wider">
                        {m.tournamentName}
                      </h4>
                      <span className="text-[10px] font-bold text-gold-primary bg-gold-primary/10 border border-gold-primary/20 px-2 py-0.5 rounded shadow-gold-glow mt-1 inline-block uppercase">
                        {m.sport}
                      </span>
                    </div>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson-primary"></span>
                    </span>
                  </div>

                  <div className="text-center py-4 bg-obsidian-dark/50 border border-obsidian-light/30 rounded-lg mb-4">
                    <span className="text-[10px] text-ivory-muted uppercase font-bold tracking-widest">
                      {m.roundName}
                    </span>
                    <div className="flex items-center justify-center gap-6 mt-3 px-4">
                      <div className="flex flex-col items-center flex-1 max-w-[140px]">
                        <span className="text-sm font-bold text-ivory-primary text-center truncate w-full">
                          {m.team1?.name}
                        </span>
                        {m.team1?.code && <span className="text-[9px] text-ivory-muted mt-0.5">{m.team1.code}</span>}
                      </div>

                      <div className="text-2xl font-extrabold text-crimson-primary font-sans bg-crimson-primary/10 border border-crimson-primary/20 px-4 py-1.5 rounded-lg animate-pulse">
                        {m.team1Score} — {m.team2Score}
                      </div>

                      <div className="flex flex-col items-center flex-1 max-w-[140px]">
                        <span className="text-sm font-bold text-ivory-primary text-center truncate w-full">
                          {m.team2?.name}
                        </span>
                        {m.team2?.code && <span className="text-[9px] text-ivory-muted mt-0.5">{m.team2.code}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-ivory-muted mt-2 border-t border-obsidian-light/30 pt-3">
                  {m.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-ivory-dark" />
                      {m.venue}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5 text-gold-primary font-bold hover:underline ml-auto">
                    Go to Bracket
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Tournament Slide-over Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-obsidian-light bg-obsidian-card p-6 shadow-gold-glow-strong relative">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setError('');
              }}
              className="absolute top-4 right-4 text-ivory-muted hover:text-ivory-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-ivory-primary mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-gold-primary" />
              New Tournament
            </h3>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ivory-muted mb-1.5">Tournament Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none transition-colors"
                  placeholder="e.g. Summer Corporate Cup"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ivory-muted mb-1.5">
                  Sports (Comma Separated) *
                </label>
                <input
                  type="text"
                  required
                  value={sportsInput}
                  onChange={(e) => setSportsInput(e.target.value)}
                  className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none transition-colors"
                  placeholder="e.g. Football, Basketball, Tennis"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ivory-muted mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none transition-colors"
                  rows={2}
                  placeholder="Details about the rules or stages..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ivory-muted mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary focus:border-gold-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ivory-muted mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary focus:border-gold-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ivory-muted mb-1.5">Venue</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none transition-colors"
                  placeholder="e.g. Wembley Stadium"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 p-3 text-xs text-crimson-primary">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gold-primary py-2.5 text-sm font-bold text-obsidian-dark hover:bg-gold-light focus:outline-none disabled:opacity-50 transition-colors shadow-gold-glow"
              >
                {submitting ? 'Creating Arena...' : 'Create Tournament'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Home;

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ExcelUpload } from '../components/ExcelUpload';
import { 
  Calendar, MapPin, Trophy, AlertCircle, 
  Trash2, Play, Plus, RefreshCw, FileDown, Clock, X, Shield, Activity
} from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  code?: string;
  captainName?: string;
}

interface Match {
  _id: string;
  roundIndex: number;
  roundName: string;
  matchIndex: number;
  team1: Team | null;
  team2: Team | null;
  team1Score: string;
  team2Score: string;
  winner: Team | null;
  status: 'scheduled' | 'live' | 'completed';
  scheduledDate?: string;
  scheduledTime?: string;
  venue?: string;
  isBye: boolean;
  nextMatchId?: string;
  nextMatchSlot?: 'team1' | 'team2';
}

interface Tournament {
  _id: string;
  name: string;
  sports: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed';
  champions?: Array<{ sport: string; team: Team }>;
}

export const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bracket' | 'fixtures' | 'live' | 'results'>('dashboard');

  // Manual team add states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamCaptain, setNewTeamCaptain] = useState('');
  const [addingTeam, setAddingTeam] = useState(false);

  // Add Sport category states
  const [newSportInput, setNewSportInput] = useState('');
  const [addingSport, setAddingSport] = useState(false);

  // Match edit modal states
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchVenue, setMatchVenue] = useState('');
  const [score1, setScore1] = useState<string>('0');
  const [score2, setScore2] = useState<string>('0');
  const [winnerId, setWinnerId] = useState('');
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [matchError, setMatchError] = useState('');

  const fetchData = async (sportOverride?: string) => {
    try {
      const tournRes = await axios.get(`/api/tournaments/${id}`);
      const tournData = tournRes.data;
      setTournament(tournData);

      // Handle default sport selection
      const activeSport = sportOverride || selectedSport || (tournData.sports && tournData.sports[0]) || '';
      if (activeSport && activeSport !== selectedSport) {
        setSelectedSport(activeSport);
      }

      if (activeSport) {
        const teamsRes = await axios.get(`/api/tournaments/${id}/teams?sport=${activeSport}`);
        setTeams(teamsRes.data);

        const matchesRes = await axios.get(`/api/tournaments/${id}/bracket?sport=${activeSport}`);
        setMatches(matchesRes.data);
      }
    } catch (err) {
      console.error('Error fetching tournament details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSportChange = (sportName: string) => {
    setSelectedSport(sportName);
    setLoading(true);
    fetchData(sportName);
  };

  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    const sportName = newSportInput.trim();
    if (!sportName || !tournament) return;

    if (tournament.sports && tournament.sports.map((s: string) => s.toLowerCase()).includes(sportName.toLowerCase())) {
      alert('This sport category already exists.');
      return;
    }

    setAddingSport(true);
    try {
      const updatedSports = [...(tournament.sports || []), sportName];
      await axios.patch(`/api/tournaments/${id}`, {
        sports: updatedSports,
      });
      setNewSportInput('');
      fetchData(sportName);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add sport category.');
    } finally {
      setAddingSport(false);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !selectedSport) return;

    setAddingTeam(true);
    try {
      await axios.post(`/api/tournaments/${id}/teams/batch`, {
        sport: selectedSport,
        teams: [{
          name: newTeamName.trim(),
          code: newTeamCode.trim() || undefined,
          captainName: newTeamCaptain.trim() || undefined
        }]
      });
      setNewTeamName('');
      setNewTeamCode('');
      setNewTeamCaptain('');
      fetchData(selectedSport);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add team.');
    } finally {
      setAddingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to remove this team?')) return;

    try {
      await axios.delete(`/api/tournaments/${id}/teams/${teamId}`);
      fetchData(selectedSport);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove team.');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!confirm('Are you sure you want to clear ALL registered teams for this sport?')) return;

    try {
      await axios.delete(`/api/tournaments/${id}/teams`);
      fetchData(selectedSport);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clear teams.');
    }
  };

  const handleGenerateBracket = async () => {
    if (teams.length < 2) {
      alert(`You need at least 2 teams to generate a knockout bracket for ${selectedSport}.`);
      return;
    }
    if (!confirm(`Generate single-elimination bracket for ${teams.length} teams in ${selectedSport}?`)) return;

    setLoading(true);
    try {
      await axios.post(`/api/tournaments/${id}/bracket/generate`, {
        sport: selectedSport
      });
      await fetchData(selectedSport);
      setActiveTab('bracket');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate bracket.');
      setLoading(false);
    }
  };

  const handleRegenerateBracket = async () => {
    if (!confirm(`WARNING: This will delete ALL current matches, scores, and schedules for ${selectedSport}, and generate a brand-new bracket. Do you want to proceed?`)) return;

    setLoading(true);
    try {
      await axios.post(`/api/tournaments/${id}/bracket/regenerate`, {
        sport: selectedSport
      });
      await fetchData(selectedSport);
      setActiveTab('bracket');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to regenerate bracket.');
      setLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('CRITICAL: This will permanently delete this tournament, all teams, and all matches. This cannot be undone. Delete tournament?')) return;

    try {
      await axios.delete(`/api/tournaments/${id}`);
      navigate('/');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete tournament.');
    }
  };

  // Match Update Helpers
  const openMatchEditor = (match: Match) => {
    if (!admin) return;
    setSelectedMatch(match);
    setMatchDate(match.scheduledDate ? new Date(match.scheduledDate).toISOString().split('T')[0] : '');
    setMatchTime(match.scheduledTime || '');
    setMatchVenue(match.venue || '');
    setScore1(match.team1Score);
    setScore2(match.team2Score);
    setWinnerId(match.winner?._id || '');
    setMatchError('');
  };

  const handleUpdateSchedule = async () => {
    if (!selectedMatch) return;
    setSubmittingMatch(true);
    setMatchError('');
    try {
      await axios.patch(`/api/tournaments/${id}/matches/${selectedMatch._id}`, {
        scheduledDate: matchDate || undefined,
        scheduledTime: matchTime || undefined,
        venue: matchVenue || undefined,
      });
      setSelectedMatch(null);
      fetchData(selectedSport);
    } catch (err: any) {
      setMatchError(err.response?.data?.message || 'Failed to update schedule.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleStartMatch = async () => {
    if (!selectedMatch) return;
    setSubmittingMatch(true);
    setMatchError('');
    try {
      await axios.patch(`/api/tournaments/${id}/matches/${selectedMatch._id}/status`, {
        status: 'live',
      });
      setSelectedMatch(null);
      fetchData(selectedSport);
    } catch (err: any) {
      setMatchError(err.response?.data?.message || 'Failed to start match.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleUpdateLiveScore = async () => {
    if (!selectedMatch) return;
    setSubmittingMatch(true);
    setMatchError('');
    try {
      await axios.patch(`/api/tournaments/${id}/matches/${selectedMatch._id}`, {
        team1Score: score1,
        team2Score: score2,
      });
      setSelectedMatch(null);
      fetchData(selectedSport);
    } catch (err: any) {
      setMatchError(err.response?.data?.message || 'Failed to update live scores.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedMatch || !winnerId) return;
    setSubmittingMatch(true);
    setMatchError('');
    try {
      await axios.patch(`/api/tournaments/${id}/matches/${selectedMatch._id}/result`, {
        team1Score: score1,
        team2Score: score2,
        winnerId,
      });
      setSelectedMatch(null);
      fetchData(selectedSport);
    } catch (err: any) {
      setMatchError(err.response?.data?.message || 'Failed to submit result.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-gold-primary border-r-transparent border-b-transparent border-l-transparent" />
        <span className="text-xs text-ivory-muted mt-3">Loading arena workspace...</span>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-md text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-crimson-primary mb-3" />
        <h3 className="text-lg font-bold text-ivory-primary">Tournament Not Found</h3>
        <p className="text-xs text-ivory-muted mt-1">This arena may have been removed or doesn't exist.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-obsidian-light hover:bg-obsidian-accent border border-obsidian-light text-xs font-semibold rounded-lg text-gold-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Early Return Layout: If no sports are registered yet, prompt the user to add one
  if (!tournament.sports || tournament.sports.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Profile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-obsidian-light pb-6 mb-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-ivory-muted uppercase tracking-widest font-bold">Arena Profile</span>
            </div>
            <h1 className="text-3xl font-extrabold text-ivory-primary font-sans leading-tight">
              {tournament.name}
            </h1>
            <p className="text-xs text-ivory-muted mt-1.5 leading-relaxed max-w-xl">
              {tournament.description || "Single-elimination multi-sport championship series."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {admin && (
              <button
                onClick={handleDeleteTournament}
                className="inline-flex items-center gap-1.5 rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 hover:bg-crimson-primary/10 px-4 py-2 text-xs font-bold text-crimson-primary transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete Tournament
              </button>
            )}
          </div>
        </div>

        {/* Big Empty Warning Card */}
        <div className="rounded-xl border border-gold-primary/20 bg-gold-primary/5 p-8 text-center max-w-xl mx-auto shadow-gold-glow mt-12">
          <Activity className="mx-auto h-12 w-12 text-gold-primary mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-ivory-primary">No Sports Registered</h3>
          <p className="text-xs text-ivory-muted mt-1.5 mb-6 leading-relaxed">
            This tournament does not have any sports categories added yet. Add your first sport category below to start seeding teams and generating single-elimination brackets.
          </p>
          {admin ? (
            <form onSubmit={handleAddSport} className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                required
                value={newSportInput}
                onChange={(e) => setNewSportInput(e.target.value)}
                placeholder="e.g. Football, Basketball, Tennis"
                className="flex-1 rounded-lg border border-obsidian-light bg-obsidian-dark px-3 py-2 text-sm text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={addingSport}
                className="rounded-lg bg-gold-primary hover:bg-gold-light px-4 py-2 text-xs font-bold text-obsidian-dark shadow-gold-glow transition-all whitespace-nowrap"
              >
                {addingSport ? 'Adding...' : 'Add Sport'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-gold-primary font-semibold">Waiting for the tournament organizer to seed sports.</p>
          )}
        </div>
      </div>
    );
  }

  // Count rounds and matches
  const roundsCount = matches.length > 0 ? Math.max(...matches.map(m => m.roundIndex), 0) : 0;
  
  // Quick Filters for tabs
  const liveMatchesList = matches.filter(m => m.status === 'live');
  const resultsMatchesList = matches.filter(m => m.status === 'completed');

  // Find champion for current sport
  const currentChampion = tournament.champions?.find(c => c.sport === selectedSport)?.team;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-obsidian-light pb-6 mb-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-ivory-muted uppercase tracking-widest font-bold">Arena Profile</span>
          </div>
          <h1 className="text-3xl font-extrabold text-ivory-primary font-sans leading-tight drop-shadow-md">
            {tournament.name}
          </h1>
          <p className="text-xs text-ivory-muted mt-1.5 leading-relaxed max-w-xl">
            {tournament.description || "Single-elimination multi-sport championship series."}
          </p>
        </div>

        {/* Action Panel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {matches.length > 0 && (
            <a
              href={`/api/tournaments/${tournament._id}/fixtures/pdf?sport=${selectedSport}`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold-primary/20 bg-gold-primary/5 hover:bg-gold-primary/10 px-4 py-2 text-xs font-bold text-gold-primary transition-all shadow-gold-glow"
            >
              <FileDown className="h-4 w-4" />
              Download Schedule (PDF)
            </a>
          )}

          {admin && (
            <button
              onClick={handleDeleteTournament}
              className="inline-flex items-center gap-1.5 rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 hover:bg-crimson-primary/10 px-4 py-2 text-xs font-bold text-crimson-primary transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete Tournament
            </button>
          )}
        </div>
      </div>

      {/* Sports Tab Selector */}
      <div className="mb-6">
        <div className="text-[10px] font-bold text-gold-primary uppercase tracking-widest mb-2 flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" /> Select Sport Category
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tournament.sports.map((sport) => {
            const isSelected = selectedSport === sport;
            return (
              <button
                key={sport}
                onClick={() => handleSportChange(sport)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-gold-primary text-obsidian-dark border-gold-primary shadow-gold-glow-strong'
                    : 'bg-obsidian-card hover:bg-obsidian-light text-ivory-muted hover:text-ivory-primary border-obsidian-light'
                }`}
              >
                {sport}
              </button>
            );
          })}

          {admin && (
            <form onSubmit={handleAddSport} className="flex items-center gap-1.5 ml-2">
              <input
                type="text"
                required
                value={newSportInput}
                onChange={(e) => setNewSportInput(e.target.value)}
                placeholder="Add sport category..."
                className="rounded border border-obsidian-light bg-obsidian-dark px-2 py-1 text-xs text-ivory-primary placeholder-ivory-dark focus:border-gold-primary focus:outline-none w-36"
              />
              <button
                type="submit"
                disabled={addingSport}
                className="rounded bg-gold-primary hover:bg-gold-light p-1 text-obsidian-dark shadow-gold-glow transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="border-b border-obsidian-light mb-8">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {(['dashboard', 'bracket', 'fixtures', 'live', 'results'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let label = tab.charAt(0).toUpperCase() + tab.slice(1);
            if (tab === 'live') label = `Live (${liveMatchesList.length})`;
            
            // Hide Bracket and Matches tabs if bracket hasn't been generated
            if (matches.length === 0 && (tab === 'bracket' || tab === 'fixtures' || tab === 'live' || tab === 'results')) {
              return null;
            }

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap pb-4 text-sm font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-gold-primary text-gold-primary font-bold drop-shadow-md'
                    : 'border-transparent text-ivory-muted hover:text-ivory-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}

      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview / Dates */}
            <div className="rounded-xl border border-obsidian-light bg-obsidian-card p-6 shadow-sm hover:shadow-gold-glow transition-all">
              <h3 className="text-base font-bold text-ivory-primary mb-4">Arena Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-gold-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-ivory-muted">Championship Schedule</h5>
                    <p className="text-xs text-ivory-primary mt-0.5">
                      {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'}
                      {tournament.endDate && ` — ${new Date(tournament.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-gold-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-ivory-muted">Stadium / Venue</h5>
                    <p className="text-xs text-ivory-primary mt-0.5 truncate">{tournament.venue || 'TBD'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* If Completed, show champion! */}
            {currentChampion && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-gold-glow flex items-center justify-between gap-4 transition-all">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-gold-primary" />
                    {selectedSport} Concluded
                  </div>
                  <h3 className="text-2xl font-extrabold text-ivory-primary leading-tight font-sans">
                    {currentChampion.name}
                  </h3>
                  <p className="text-xs text-ivory-muted">Declaring the official {selectedSport} champion of {tournament.name}!</p>
                </div>
                <div className="h-16 w-16 bg-gold-primary/10 border border-gold-primary/20 rounded-full flex items-center justify-center animate-bounce shadow-gold-glow-strong">
                  <Trophy className="h-8 w-8 text-gold-primary" />
                </div>
              </div>
            )}

            {/* Teams Management (Only visible in Draft stage) */}
            {matches.length === 0 && (
              <div className="rounded-xl border border-obsidian-light bg-obsidian-card p-6 space-y-6 shadow-sm hover:shadow-gold-glow transition-all">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-ivory-primary">
                    Seed Teams ({teams.length}) — {selectedSport}
                  </h3>
                  {admin && teams.length > 0 && (
                    <button
                      onClick={handleDeleteAllTeams}
                      className="text-xs font-semibold text-crimson-primary hover:underline"
                    >
                      Clear Teams
                    </button>
                  )}
                </div>

                {admin ? (
                  <div className="space-y-6">
                    {/* Excel Drag & Drop Upload */}
                    <ExcelUpload tournamentId={tournament._id} sport={selectedSport} onImportSuccess={() => fetchData(selectedSport)} />

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-obsidian-light/50"></div>
                      <span className="flex-shrink mx-4 text-xs font-semibold text-ivory-dark uppercase tracking-widest">OR ADD MANUALLY</span>
                      <div className="flex-grow border-t border-obsidian-light/50"></div>
                    </div>

                    {/* Manual Form */}
                    <form onSubmit={handleAddTeam} className="grid gap-4 sm:grid-cols-3 items-end">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1">Team Name</label>
                        <input
                          type="text"
                          required
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-1.5 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                          placeholder="e.g. Manchester City"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1">Abbr Code (Optional)</label>
                        <input
                          type="text"
                          value={newTeamCode}
                          onChange={(e) => setNewTeamCode(e.target.value)}
                          className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-1.5 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                          placeholder="e.g. MCI"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1">Captain (Optional)</label>
                          <input
                            type="text"
                            value={newTeamCaptain}
                            onChange={(e) => setNewTeamCaptain(e.target.value)}
                            className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-1.5 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                            placeholder="e.g. De Bruyne"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={addingTeam}
                          className="rounded bg-gold-primary text-obsidian-dark hover:bg-gold-light px-4 text-xs font-bold transition-all h-8 flex items-center justify-center shrink-0 self-end shadow-gold-glow"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-ivory-muted">Sign in as Admin to seed teams or generate the bracket.</p>
                )}

                {/* Team roster preview list */}
                {teams.length > 0 ? (
                  <div className="border border-obsidian-light rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-obsidian-light/50 text-left text-xs text-ivory-muted">
                      <thead className="bg-obsidian-dark text-[10px] font-bold text-gold-primary uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">#</th>
                          <th className="px-4 py-2.5">Team Name</th>
                          <th className="px-4 py-2.5">Abbreviation</th>
                          <th className="px-4 py-2.5">Captain</th>
                          {admin && <th className="px-4 py-2.5 text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-obsidian-light/30 bg-obsidian-card/45 font-sans">
                        {teams.map((t, index) => (
                          <tr key={t._id} className="hover:bg-obsidian-light/20 hover:shadow-gold-glow transition-all">
                            <td className="px-4 py-2.5 text-ivory-dark font-medium">{index + 1}</td>
                            <td className="px-4 py-2.5 text-ivory-primary font-bold">{t.name}</td>
                            <td className="px-4 py-2.5">{t.code || '—'}</td>
                            <td className="px-4 py-2.5">{t.captainName || '—'}</td>
                            {admin && (
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  onClick={() => handleDeleteTeam(t._id)}
                                  className="text-crimson-primary hover:text-crimson-light font-semibold"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 rounded border border-dashed border-obsidian-light">
                    <Trophy className="mx-auto h-8 w-8 text-ivory-dark mb-2" />
                    <p className="text-xs text-ivory-muted">Roster is empty. Import excel or add manually.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Stats / Generation Board */}
          <div className="space-y-6">
            <div className="rounded-xl border border-obsidian-light bg-obsidian-card p-6 shadow-sm hover:shadow-gold-glow transition-all">
              <h3 className="text-sm font-bold text-ivory-primary mb-3">Arena Details ({selectedSport})</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs border-b border-obsidian-light/50 pb-2.5">
                  <span className="text-ivory-muted">Status</span>
                  <span className="font-bold text-gold-primary uppercase">{tournament.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-obsidian-light/50 pb-2.5">
                  <span className="text-ivory-muted">Teams Registered</span>
                  <span className="font-bold text-ivory-primary">{teams.length}</span>
                </div>
                {matches.length > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs border-b border-obsidian-light/50 pb-2.5">
                      <span className="text-ivory-muted">Bracket Matches</span>
                      <span className="font-bold text-ivory-primary">{matches.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-obsidian-light/50 pb-2.5">
                      <span className="text-ivory-muted">Completed Matches</span>
                      <span className="font-bold text-ivory-primary">
                        {matches.filter(m => m.status === 'completed').length}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {admin && (
                <div className="mt-6 pt-4 border-t border-obsidian-light/50 space-y-3">
                  {matches.length === 0 ? (
                    <button
                      onClick={handleGenerateBracket}
                      disabled={teams.length < 2}
                      className="w-full rounded-lg bg-gold-primary hover:bg-gold-light py-2 text-xs font-bold text-obsidian-dark focus:outline-none disabled:opacity-50 transition-colors shadow-gold-glow"
                    >
                      Generate Bracket
                    </button>
                  ) : (
                    <button
                      onClick={handleRegenerateBracket}
                      className="w-full rounded-lg border border-gold-primary/20 bg-gold-primary/5 hover:bg-gold-primary/10 py-2 text-xs font-bold text-gold-primary focus:outline-none transition-colors flex items-center justify-center gap-1.5 shadow-sm hover:shadow-gold-glow"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate Bracket
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Roster sidebar if bracket is published */}
            {matches.length > 0 && teams.length > 0 && (
              <div className="rounded-xl border border-obsidian-light bg-obsidian-card p-6 shadow-sm hover:shadow-gold-glow transition-all">
                <h3 className="text-sm font-bold text-ivory-primary mb-3">Seeded Roster ({teams.length})</h3>
                <ul className="text-xs text-ivory-muted space-y-2 max-h-60 overflow-y-auto pr-1">
                  {teams.map((t, idx) => (
                    <li key={t._id} className="flex justify-between items-center py-1.5 border-b border-obsidian-light/30 hover:text-gold-primary transition-colors">
                      <span className="font-semibold text-ivory-primary">{t.name}</span>
                      <span className="text-[10px] font-bold text-gold-primary bg-gold-primary/10 px-1.5 py-0.5 rounded shadow-gold-glow">
                        {t.code || `SEED ${idx + 1}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BRACKET VIEW TAB */}
      {activeTab === 'bracket' && matches.length > 0 && (
        <div className="w-full overflow-x-auto pb-8 scroll-smooth no-scrollbar">
          <div className="flex gap-16 min-w-max px-4">
            {Array.from({ length: roundsCount }).map((_, idx) => {
              const roundIndex = idx + 1;
              const roundMatches = matches
                .filter(m => m.roundIndex === roundIndex)
                .sort((a, b) => a.matchIndex - b.matchIndex);

              const roundName = roundMatches[0]?.roundName || `Round ${roundIndex}`;

              return (
                <div key={roundIndex} className="w-64 shrink-0 flex flex-col">
                  {/* Round Heading */}
                  <div className="text-center bg-obsidian-light border border-obsidian-accent rounded-lg py-2 mb-8 shadow-gold-glow">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-primary">
                      {roundName}
                    </span>
                  </div>

                  {/* Vertical Flex list of matches distributed in height */}
                  <div className="flex-1 flex flex-col justify-around min-h-[500px] py-4 relative">
                    {roundMatches.map((m) => {
                      const hasTwoTeams = m.team1 && m.team2;
                      const isCompleted = m.status === 'completed';
                      const isLive = m.status === 'live';
                      
                      const t1Win = isCompleted && m.winner?._id === m.team1?._id;
                      const t2Win = isCompleted && m.winner?._id === m.team2?._id;

                      const isClickable = admin && (hasTwoTeams || m.isBye);

                      return (
                        <div
                          key={m._id}
                          onClick={() => isClickable && openMatchEditor(m)}
                          className={`rounded-xl border bg-obsidian-card p-3 flex flex-col justify-between transition-all duration-300 relative select-none ${
                            isClickable 
                              ? 'cursor-pointer hover:border-gold-primary/50 hover:shadow-gold-glow-strong' 
                              : 'border-obsidian-light'
                          } ${isLive ? 'border-crimson-primary/40 shadow-crimson-glow' : ''} ${
                            isCompleted ? 'border-gold-primary/20 shadow-gold-glow' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between text-[8px] font-bold text-ivory-dark uppercase mb-2">
                            <span>MATCH {m.matchIndex}</span>
                            {isLive && (
                              <span className="flex items-center gap-1 text-crimson-primary bg-crimson-primary/10 border border-crimson-primary/30 px-1 rounded font-bold animate-pulse shadow-crimson-glow">
                                LIVE
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded font-bold">
                                FT
                              </span>
                            )}
                            {m.isBye && (
                              <span className="text-gold-primary bg-gold-primary/10 px-1 rounded font-bold shadow-gold-glow">
                                BYE
                              </span>
                            )}
                          </div>

                          {/* Team 1 */}
                          <div className="flex items-center justify-between py-1 border-b border-obsidian-light/30">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className={`text-[9px] font-bold font-sans px-1 py-0.5 rounded ${
                                t1Win ? 'bg-gold-primary text-black shadow-gold-glow' : 'bg-obsidian-light text-ivory-muted'
                              }`}>
                                1
                              </span>
                              <span className={`text-xs font-semibold truncate ${
                                t1Win ? 'text-gold-primary font-bold' : (isCompleted ? 'text-ivory-muted' : 'text-ivory-primary')
                              }`}>
                                {m.team1 ? m.team1.name : (m.isBye ? 'BYE' : 'TBD')}
                              </span>
                            </div>
                            {!m.isBye && (
                              <span className={`text-xs font-bold font-sans ${
                                t1Win ? 'text-gold-primary' : (isCompleted ? 'text-ivory-muted' : 'text-ivory-primary')
                              }`}>
                                {m.status !== 'scheduled' ? m.team1Score : '—'}
                              </span>
                            )}
                          </div>

                          {/* Team 2 */}
                          <div className="flex items-center justify-between py-1 mt-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className={`text-[9px] font-bold font-sans px-1 py-0.5 rounded ${
                                t2Win ? 'bg-gold-primary text-black shadow-gold-glow' : 'bg-obsidian-light text-ivory-muted'
                              }`}>
                                2
                              </span>
                              <span className={`text-xs font-semibold truncate ${
                                t2Win ? 'text-gold-primary font-bold' : (isCompleted ? 'text-ivory-muted' : 'text-ivory-primary')
                              }`}>
                                {m.team2 ? m.team2.name : (m.isBye ? 'BYE' : 'TBD')}
                              </span>
                            </div>
                            {!m.isBye && (
                              <span className={`text-xs font-bold font-sans ${
                                t2Win ? 'text-gold-primary' : (isCompleted ? 'text-ivory-muted' : 'text-ivory-primary')
                              }`}>
                                {m.status !== 'scheduled' ? m.team2Score : '—'}
                              </span>
                            )}
                          </div>

                          {/* Schedule / Venue details */}
                          {(m.scheduledDate || m.venue) && (
                            <div className="mt-2.5 pt-2 border-t border-obsidian-light/30 flex items-center justify-between text-[8px] text-ivory-muted">
                              <span className="truncate flex items-center gap-0.5">
                                <Clock className="h-2 w-2 text-gold-primary" />
                                {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : ''} 
                                {m.scheduledTime ? ` @ ${m.scheduledTime}` : ''}
                              </span>
                              <span className="truncate max-w-[80px]">{m.venue || ''}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. FIXTURES TAB */}
      {activeTab === 'fixtures' && matches.length > 0 && (
        <div className="space-y-8 max-w-3xl mx-auto">
          {Array.from({ length: roundsCount }).map((_, idx) => {
            const roundIndex = idx + 1;
            const roundMatches = matches
              .filter(m => m.roundIndex === roundIndex)
              .sort((a, b) => a.matchIndex - b.matchIndex);

            const roundName = roundMatches[0]?.roundName || `Round ${roundIndex}`;

            return (
              <div key={roundIndex} className="space-y-3">
                <h4 className="text-xs font-bold text-gold-primary uppercase tracking-widest border-b border-obsidian-light pb-2 shadow-gold-glow">
                  {roundName}
                </h4>

                <div className="grid gap-4">
                  {roundMatches.map((m) => {
                    const isCompleted = m.status === 'completed';
                    const isLive = m.status === 'live';

                    return (
                      <div
                        key={m._id}
                        onClick={() => admin && (m.team1 && m.team2) && openMatchEditor(m)}
                        className={`rounded-xl border border-obsidian-light bg-obsidian-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                          admin && (m.team1 && m.team2) ? 'cursor-pointer hover:border-gold-primary/30 hover:shadow-gold-glow' : ''
                        } ${isLive ? 'border-crimson-primary/30 bg-crimson-primary/5 shadow-crimson-glow' : ''}`}
                      >
                        {/* Match Details */}
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center justify-center bg-obsidian-light h-10 w-10 rounded-lg text-center shrink-0 border border-obsidian-accent shadow-gold-glow">
                            <span className="text-[10px] font-bold text-gold-primary">M</span>
                            <span className="text-xs font-bold text-ivory-primary">{m.matchIndex}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-3 font-bold font-sans text-sm">
                              <span className={isCompleted && m.winner?._id === m.team1?._id ? 'text-gold-primary' : 'text-ivory-primary'}>
                                {m.team1 ? m.team1.name : (m.isBye ? 'BYE' : 'TBD')}
                              </span>
                              <span className="text-xs text-ivory-dark font-normal">vs</span>
                              <span className={isCompleted && m.winner?._id === m.team2?._id ? 'text-gold-primary' : 'text-ivory-primary'}>
                                {m.team2 ? m.team2.name : (m.isBye ? 'BYE' : 'TBD')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ivory-muted">
                              {m.scheduledDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-gold-primary" />
                                  {new Date(m.scheduledDate).toLocaleDateString()}
                                </span>
                              )}
                              {m.scheduledTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-gold-primary" />
                                  {m.scheduledTime}
                                </span>
                              )}
                              {m.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-gold-primary" />
                                  {m.venue}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status/Score badge */}
                        <div className="shrink-0 flex items-center justify-end sm:justify-start gap-4">
                          {isCompleted ? (
                            <span className="rounded-lg bg-gold-primary/10 border border-gold-primary/30 px-3 py-1.5 text-xs font-extrabold text-gold-primary font-sans shadow-gold-glow">
                              {m.team1Score} — {m.team2Score}
                            </span>
                          ) : isLive ? (
                            <div className="flex items-center gap-2">
                              <span className="animate-pulse rounded bg-crimson-primary px-2 py-0.5 text-[9px] font-bold text-white shadow-crimson-glow">
                                LIVE
                              </span>
                              <span className="rounded-lg bg-crimson-primary/10 border border-crimson-primary/30 px-3 py-1.5 text-xs font-extrabold text-crimson-primary font-sans animate-pulse shadow-crimson-glow">
                                {m.team1Score} — {m.team2Score}
                              </span>
                            </div>
                          ) : m.isBye ? (
                            <span className="rounded bg-gold-primary/5 border border-gold-primary/20 px-2.5 py-1 text-[10px] font-bold text-gold-primary shadow-gold-glow">
                              BYE ADVANCED
                            </span>
                          ) : (
                            <span className="rounded bg-obsidian-light border border-obsidian-accent px-2.5 py-1 text-[10px] font-bold text-ivory-muted">
                              SCHEDULED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. LIVE FILTER TAB */}
      {activeTab === 'live' && matches.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <h4 className="text-xs font-bold text-crimson-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-obsidian-light pb-2 mb-4 shadow-crimson-glow">
            <span className="h-2 w-2 rounded-full bg-crimson-primary animate-pulse" />
            Live Encounters ({liveMatchesList.length})
          </h4>

          {liveMatchesList.length === 0 ? (
            <div className="text-center py-20 bg-obsidian-card border border-obsidian-light rounded-xl">
              <Activity className="mx-auto h-10 w-10 text-ivory-dark mb-2 animate-pulse" />
              <p className="text-xs text-ivory-muted">No live matches running at this moment.</p>
            </div>
          ) : (
            liveMatchesList.map(m => (
              <div
                key={m._id}
                onClick={() => admin && openMatchEditor(m)}
                className="rounded-xl border border-crimson-primary/30 bg-crimson-primary/5 p-5 flex items-center justify-between gap-6 cursor-pointer hover:border-crimson-primary/60 transition-all shadow-crimson-glow"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-crimson-primary uppercase tracking-wider">
                    {m.roundName}
                  </span>
                  <div className="flex items-center gap-3 font-bold font-sans text-base">
                    <span>{m.team1?.name}</span>
                    <span className="text-xs text-ivory-dark font-normal">vs</span>
                    <span>{m.team2?.name}</span>
                  </div>
                  {m.venue && (
                    <div className="flex items-center gap-1 text-xs text-ivory-muted">
                      <MapPin className="h-3.5 w-3.5 text-gold-primary" />
                      {m.venue}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-extrabold font-sans text-crimson-primary bg-crimson-primary/10 border border-crimson-primary/20 px-4 py-2 rounded-xl animate-pulse">
                  {m.team1Score} — {m.team2Score}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. RESULTS TAB */}
      {activeTab === 'results' && matches.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <h4 className="text-xs font-bold text-gold-primary uppercase tracking-widest border-b border-obsidian-light pb-2 mb-4 shadow-gold-glow">
            Completed Results ({resultsMatchesList.length})
          </h4>

          {resultsMatchesList.length === 0 ? (
            <div className="text-center py-20 bg-obsidian-card border border-obsidian-light rounded-xl">
              <Trophy className="mx-auto h-10 w-10 text-ivory-dark mb-2" />
              <p className="text-xs text-ivory-muted">No matches completed yet. Let the games begin!</p>
            </div>
          ) : (
            resultsMatchesList.map(m => (
              <div
                key={m._id}
                className="rounded-xl border border-gold-primary/10 bg-obsidian-card p-5 flex items-center justify-between gap-6 shadow-sm hover:shadow-gold-glow transition-all"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gold-primary uppercase tracking-wider">
                    {m.roundName}
                  </span>
                  <div className="flex items-center gap-3 font-bold font-sans text-base">
                    <span className={m.winner?._id === m.team1?._id ? 'text-gold-primary font-extrabold' : 'text-ivory-muted'}>
                      {m.team1?.name}
                    </span>
                    <span className="text-xs text-ivory-dark font-normal">vs</span>
                    <span className={m.winner?._id === m.team2?._id ? 'text-gold-primary font-extrabold' : 'text-ivory-muted'}>
                      {m.team2?.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-ivory-dark">
                    Winner: <span className="font-semibold text-emerald-400">{m.winner?.name}</span>
                  </div>
                </div>
                <div className="text-xl font-extrabold font-sans text-gold-primary bg-gold-primary/5 border border-gold-primary/20 px-4 py-2 rounded-xl shadow-gold-glow">
                  {m.team1Score} — {m.team2Score}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MATCH EDITOR MODAL (ADMIN ONLY) */}
      {selectedMatch && admin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-obsidian-light bg-obsidian-card p-6 shadow-gold-glow-strong relative">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-ivory-muted hover:text-ivory-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-ivory-primary mb-1.5 flex items-center gap-2">
              <Shield className="h-5 w-5 text-gold-primary" />
              Match Manager (M{selectedMatch.matchIndex})
            </h3>
            <p className="text-[11px] text-ivory-muted mb-4 uppercase tracking-wider font-semibold border-b border-obsidian-light pb-2.5">
              {selectedMatch.roundName}
            </p>

            <div className="space-y-6">
              {/* SECTION A: Scheduling Details (Only if not completed) */}
              {selectedMatch.status !== 'completed' && (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-gold-primary uppercase tracking-wider">1. Schedule & Venue</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1">Date</label>
                      <input
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-1.5 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1">Time</label>
                      <input
                        type="text"
                        value={matchTime}
                        onChange={(e) => setMatchTime(e.target.value)}
                        className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-1.5 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                        placeholder="e.g. 15:30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1">Venue</label>
                    <input
                      type="text"
                      value={matchVenue}
                      onChange={(e) => setMatchVenue(e.target.value)}
                      className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-1.5 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                      placeholder="e.g. Court A, Pitch 2"
                    />
                  </div>
                  <button
                    onClick={handleUpdateSchedule}
                    disabled={submittingMatch}
                    className="w-full rounded bg-obsidian-light hover:bg-obsidian-accent border border-obsidian-accent/50 py-2 text-xs font-bold text-ivory-primary transition-all shadow-sm hover:shadow-gold-glow"
                  >
                    Save Scheduling Details
                  </button>
                </div>
              )}

              {/* SECTION B: Match Status shift */}
              {selectedMatch.status === 'scheduled' && selectedMatch.team1 && selectedMatch.team2 && (
                <div className="pt-4 border-t border-obsidian-light/50 space-y-3">
                  <h4 className="text-xs font-bold text-crimson-primary uppercase tracking-wider">2. Match Operations</h4>
                  <p className="text-[11px] text-ivory-muted leading-relaxed">
                    Ready to kickoff? Move match status to **Live** to enable live scoring updates.
                  </p>
                  <button
                    onClick={handleStartMatch}
                    disabled={submittingMatch}
                    className="w-full rounded bg-crimson-primary hover:bg-crimson-dark py-2 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-crimson-glow"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Kickoff! Go Live
                  </button>
                </div>
              )}

              {/* SECTION C: Score Submission */}
              {selectedMatch.status !== 'completed' && selectedMatch.team1 && selectedMatch.team2 && (
                <div className="pt-4 border-t border-obsidian-light/50 space-y-4">
                  <h4 className="text-xs font-bold text-gold-primary uppercase tracking-wider">3. Record Score</h4>
                  
                  <div className="grid grid-cols-2 gap-6 items-center">
                    {/* Team 1 Score */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-ivory-muted uppercase truncate">
                        {selectedMatch.team1.name} Score
                      </label>
                      <input
                        type="text"
                        value={score1}
                        onChange={(e) => setScore1(e.target.value)}
                        className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-2 text-sm font-bold text-ivory-primary text-center focus:border-gold-primary focus:outline-none font-sans"
                        placeholder="0"
                      />
                    </div>

                    {/* Team 2 Score */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-ivory-muted uppercase truncate">
                        {selectedMatch.team2.name} Score
                      </label>
                      <input
                        type="text"
                        value={score2}
                        onChange={(e) => setScore2(e.target.value)}
                        className="w-full rounded bg-obsidian-dark border border-obsidian-light px-3 py-2 text-sm font-bold text-ivory-primary text-center focus:border-gold-primary focus:outline-none font-sans"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleUpdateLiveScore}
                      disabled={submittingMatch}
                      className="flex-1 rounded bg-obsidian-light hover:bg-obsidian-accent border border-obsidian-accent/50 py-2.5 text-xs font-bold text-ivory-primary transition-all shadow-sm hover:shadow-gold-glow"
                    >
                      Save Current Scores
                    </button>
                  </div>

                  <div className="pt-4 border-t border-obsidian-light/30">
                    <label className="block text-[10px] font-bold text-ivory-muted uppercase mb-1.5">Declare Match Winner & Close Match</label>
                    <div className="flex gap-2">
                      <select
                        value={winnerId}
                        onChange={(e) => setWinnerId(e.target.value)}
                        className="flex-1 rounded bg-obsidian-dark border border-obsidian-light px-3 py-2 text-xs text-ivory-primary focus:border-gold-primary focus:outline-none"
                      >
                        <option value="">-- Choose Winner --</option>
                        <option value={selectedMatch.team1._id}>{selectedMatch.team1.name}</option>
                        <option value={selectedMatch.team2._id}>{selectedMatch.team2.name}</option>
                      </select>
                      
                      <button
                        onClick={handleSubmitResult}
                        disabled={submittingMatch || !winnerId}
                        className="rounded bg-emerald-500 hover:bg-emerald-600 px-4 text-xs font-bold text-black disabled:opacity-50 transition-colors shadow-sm"
                      >
                        Complete Match
                      </button>
                    </div>
                  </div>

                  {matchError && (
                    <div className="rounded border border-crimson-primary/20 bg-crimson-primary/5 p-2.5 text-[11px] text-crimson-primary">
                      {matchError}
                    </div>
                  )}
                </div>
              )}

              {/* If it's a bye match */}
              {selectedMatch.isBye && (
                <div className="pt-2 text-center text-xs text-ivory-muted leading-relaxed font-sans border-t border-obsidian-light/50">
                  <Trophy className="mx-auto h-6 w-6 text-gold-primary mb-2 shadow-gold-glow" />
                  This match is a **Bye advancement**.
                  <br />
                  <span className="font-bold text-gold-primary">
                    {selectedMatch.team1?.name}
                  </span> was advanced automatically to the next round.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TournamentDetail;

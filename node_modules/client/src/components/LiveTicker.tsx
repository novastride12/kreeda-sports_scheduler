import { useEffect, useState } from 'react';
import axios from 'axios';
import { Flame, ChevronRight } from 'lucide-react';

interface Match {
  _id: string;
  tournamentId: string;
  roundName: string;
  team1: { name: string; code?: string } | null;
  team2: { name: string; code?: string } | null;
  team1Score: number;
  team2Score: number;
  status: 'scheduled' | 'live' | 'completed';
}

interface Tournament {
  _id: string;
  name: string;
}

export const LiveTicker = () => {
  const [liveMatches, setLiveMatches] = useState<Array<Match & { tournamentName: string }>>([]);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const tournamentsResponse = await axios.get('/api/tournaments');
        const tourns = tournamentsResponse.data;
        
        const allLive: Array<Match & { tournamentName: string }> = [];

        // Fetch matches for each active tournament in parallel
        await Promise.all(
          tourns.map(async (t: Tournament) => {
            const matchesResponse = await axios.get(`/api/tournaments/${t._id}/matches`);
            const liveForTourn = matchesResponse.data.filter((m: Match) => m.status === 'live');
            liveForTourn.forEach((m: Match) => {
              allLive.push({ ...m, tournamentName: t.name });
            });
          })
        );

        setLiveMatches(allLive);
      } catch (err) {
        console.error('Error fetching live ticker matches:', err);
      }
    };

    fetchLiveMatches();
    
    // Poll every 10 seconds for live score updates!
    const interval = setInterval(fetchLiveMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-obsidian-card border-b border-obsidian-light py-2 px-4 overflow-hidden relative">
      <div className="mx-auto max-w-7xl flex items-center gap-4 text-xs">
        {/* Ticker Title Badge */}
        <div className="flex items-center gap-1.5 bg-crimson-primary/10 border border-crimson-primary/30 text-crimson-primary px-2.5 py-1 rounded font-bold uppercase tracking-wider shrink-0 z-10">
          <Flame className="h-3.5 w-3.5 animate-pulse" />
          Live Arena
        </div>

        {/* Sliding items */}
        <div className="flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-8 py-0.5">
          {liveMatches.length > 0 ? (
            liveMatches.map((m) => (
              <div
                key={m._id}
                className="flex items-center gap-3 bg-obsidian-light border border-obsidian-accent/50 px-3 py-1 rounded-md shrink-0 shadow-crimson-glow"
              >
                <span className="text-[10px] text-ivory-muted uppercase tracking-wider font-semibold">
                  {m.tournamentName} — {m.roundName}
                </span>
                <ChevronRight className="h-3 w-3 text-gold-primary" />
                <div className="flex items-center gap-2 font-bold font-sans">
                  <span className="text-ivory-primary">{m.team1?.code || m.team1?.name}</span>
                  <span className="text-gold-primary bg-gold-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                    {m.team1Score}
                  </span>
                  <span className="text-ivory-dark font-normal text-[10px] px-0.5">vs</span>
                  <span className="text-ivory-primary">{m.team2?.code || m.team2?.name}</span>
                  <span className="text-gold-primary bg-gold-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                    {m.team2Score}
                  </span>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson-primary"></span>
                </span>
              </div>
            ))
          ) : (
            <div className="text-ivory-muted font-medium py-1 animate-pulse">
              Kreeda Arena: Single-Elimination Knockout Championship Series. No matches active right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LiveTicker;

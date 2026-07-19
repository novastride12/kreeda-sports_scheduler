import { Schema, model, Types } from 'mongoose';

const TeamSchema = new Schema(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    sport: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String },
    captainName: { type: String },
  },
  { timestamps: true }
);

// Add unique index on team name per tournament and sport to avoid duplicates
TeamSchema.index({ tournamentId: 1, sport: 1, name: 1 }, { unique: true });

export const Team = model('Team', TeamSchema);
export default Team;

import { Schema, model, Types } from 'mongoose';

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true },
    sports: { type: [String], required: true, default: [] },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    venue: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed'],
      default: 'draft',
      required: true,
    },
    champions: [
      {
        sport: { type: String, required: true },
        team: { type: Schema.Types.ObjectId, ref: 'Team', required: true }
      }
    ],
  },
  { timestamps: true }
);

export const Tournament = model('Tournament', TournamentSchema);
export default Tournament;

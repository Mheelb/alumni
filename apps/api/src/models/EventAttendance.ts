import mongoose from 'mongoose';

export interface IEventAttendance {
  eventId: mongoose.Types.ObjectId;
  userId: string;
  status: 'going' | 'interested' | 'not_going';
  createdAt?: Date;
  updatedAt?: Date;
}

const EventAttendanceSchema = new mongoose.Schema<IEventAttendance>({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['going', 'interested', 'not_going'], required: true },
}, { timestamps: true });

EventAttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const EventAttendance = mongoose.model<IEventAttendance>('EventAttendance', EventAttendanceSchema);

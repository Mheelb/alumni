import mongoose from 'mongoose';

export interface IEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  imageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const EventMongoSchema = new mongoose.Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String, default: null },
}, { timestamps: true });

export const Event = mongoose.model<IEvent>('Event', EventMongoSchema);

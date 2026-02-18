import mongoose from 'mongoose';
import { AlumniType } from '@alumni/shared-schema';

const AlumniSchema = new mongoose.Schema<AlumniType>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  graduationYear: Number,
}, { timestamps: true });

export const Alumni = mongoose.model<AlumniType>('Alumni', AlumniSchema);

import mongoose from 'mongoose';
import { AlumniProfileType } from '@alumni/shared-schema';

const AlumniMongoSchema = new mongoose.Schema<AlumniProfileType>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  graduationYear: Number,
  diploma: String,
  city: String,
  company: String,
  jobTitle: String,
  phone: String,
  avatarUrl: String,
  linkedinUrl: String,
  status: { type: String, enum: ['unlinked', 'invited', 'registered'], default: 'unlinked' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Alumni = mongoose.model<AlumniProfileType>('Alumni', AlumniMongoSchema);

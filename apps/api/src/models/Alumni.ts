import mongoose from 'mongoose';
import type { AlumniProfileType } from '@alumni/shared-schema';

type AlumniDoc = AlumniProfileType & { createdAt?: Date; updatedAt?: Date };

const AlumniMongoSchema = new mongoose.Schema<AlumniDoc>({
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

export const Alumni = mongoose.model<AlumniDoc>('Alumni', AlumniMongoSchema);

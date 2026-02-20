import mongoose from 'mongoose';
import type { ProfileUpdateRequestType } from '@alumni/shared-schema';

// Define the interface for the document, overriding the string types from the shared schema
// with Mongoose's ObjectId or keeping them as any/string if needed for flexibility.
interface IProfileUpdateRequest extends Omit<ProfileUpdateRequestType, 'alumniId' | 'userId'> {
  alumniId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileUpdateRequestMongoSchema = new mongoose.Schema<IProfileUpdateRequest>({
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changes: { type: Object, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'refused'], 
    default: 'pending' 
  },
}, { timestamps: true });

export const ProfileUpdateRequest = mongoose.models.ProfileUpdateRequest || mongoose.model<IProfileUpdateRequest>('ProfileUpdateRequest', ProfileUpdateRequestMongoSchema);

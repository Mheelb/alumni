import mongoose from 'mongoose';

export interface IJobInterest {
  jobId: mongoose.Types.ObjectId;
  userId: string;
  status: 'interested' | 'not_interested';
  createdAt?: Date;
  updatedAt?: Date;
}

const JobInterestSchema = new mongoose.Schema<IJobInterest>({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobAnnouncement', required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['interested', 'not_interested'], required: true },
}, { timestamps: true });

JobInterestSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export const JobInterest = mongoose.model<IJobInterest>('JobInterest', JobInterestSchema);

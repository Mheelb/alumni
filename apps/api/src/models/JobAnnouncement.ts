import mongoose from 'mongoose';

export interface IJobAnnouncement {
  title: string;
  company: string;
  type: 'CDI' | 'CDD' | 'stage' | 'alternance' | 'freelance';
  location: string;
  description: string;
  url?: string | null;
  status: 'draft' | 'active' | 'closed';
  createdAt?: Date;
  updatedAt?: Date;
}

const JobAnnouncementSchema = new mongoose.Schema<IJobAnnouncement>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  type: { type: String, enum: ['CDI', 'CDD', 'stage', 'alternance', 'freelance'], required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  url: { type: String, default: null },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
}, { timestamps: true });

export const JobAnnouncement = mongoose.model<IJobAnnouncement>('JobAnnouncement', JobAnnouncementSchema);

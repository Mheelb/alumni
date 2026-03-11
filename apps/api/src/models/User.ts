import mongoose from 'mongoose';

// Minimal schema for Better-Auth users to allow Mongoose population
const UserMongoSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  firstName: String,
  lastName: String,
  alumniId: mongoose.Schema.Types.ObjectId,
}, { strict: false, collection: 'user' }); // 'user' is the collection name used by better-auth

// Check if the model already exists before defining it
export const User = mongoose.models.User || mongoose.model('User', UserMongoSchema);

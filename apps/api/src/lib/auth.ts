import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { admin } from "better-auth/plugins";

const client = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017/alumni");
const db = client.db();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    signUp: {
      enabled: true,
    },
  },
  plugins: [
    admin({
      defaultRole: "alumni",
    }),
  ],
  user: {
    additionalFields: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      graduationYear: { type: "number", required: false },
      alumniId: { type: "string", required: false },
      lastLogin: { type: "date", required: false },
    },
  },
  trustedOrigins: [process.env.WEB_URL || "http://localhost:5173"],
});

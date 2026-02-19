import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017/alumni");
const db = client.db();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      role: { type: "string" },
      graduationYear: { type: "number", required: false },
    },
  },
  trustedOrigins: [process.env.WEB_URL || "http://localhost:5173"],
});

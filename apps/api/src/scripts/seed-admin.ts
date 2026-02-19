import { auth } from "../lib/auth";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

async function seedAdmin() {
  try {
    console.log("Auth options emailPassword:", JSON.stringify(auth.options.emailAndPassword, null, 2));
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const adminEmail = "admin@alumni.com";
    const adminPassword = "password123";

    const user = await auth.api.signUpEmail({
      body: {
        name: "System Admin",
        email: adminEmail,
        password: adminPassword,
        firstName: "System",
        lastName: "Admin",
        role: "admin",
      },
    });

    console.log("Admin account created successfully:", user);
  } catch (error) {
    console.error("Error seeding admin account:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();

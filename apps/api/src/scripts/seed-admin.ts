import { auth } from "../lib/auth";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const adminEmail = "mho@test.fr";
    const adminPassword = "password123";

    // Create user without the 'role' field first
    const user = await auth.api.signUpEmail({
      body: {
        name: "Mattéo Helb",
        email: adminEmail,
        password: adminPassword,
        firstName: "Mattéo",
        lastName: "Helb",
      },
    });

    console.log("Compte utilisateur créé. Attribution du rôle admin...");

    // Update role directly in the DB
    const db = mongoose.connection.db;
    if (db) {
      await db.collection("user").updateOne(
        { email: adminEmail },
        { $set: { role: "admin" } }
      );
      console.log("Rôle admin attribué avec succès !");
    }
  } catch (error: any) {
    // If user already exists, we update the role anyway
    if (error.body?.code === "USER_ALREADY_EXISTS") {
      console.log("L'utilisateur existe déjà. Mise à jour forcée du rôle en 'admin'...");
      const db = mongoose.connection.db;
      if (db) {
        await db.collection("user").updateOne(
          { email: "mho@test.fr" },
          { $set: { role: "admin" } }
        );
        console.log("Rôle admin forcé avec succès.");
      }
    } else {
      console.error("Error seeding admin account:", error);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();

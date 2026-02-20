import { auth } from './auth';
import { Alumni } from '../models/Alumni';
import mongoose from 'mongoose';

// Helper to get session from request
export async function getSession(request: any) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        } else {
          headers.set(key, String(value));
        }
      }
    }
    
    // BetterAuth expect standard Request object for its helpers sometimes
    // But auth.api.getSession usually takes headers directly
    const session = await auth.api.getSession({
      headers: headers,
    });

    // Detect first login and update status
    if (session && session.user && !session.user.lastLogin) {
      const now = new Date();
      // Update user lastLogin
      await mongoose.connection.db?.collection('user').updateOne(
        { id: session.user.id },
        { $set: { lastLogin: now } }
      );
      
      // Update Alumni status to registered if linked
      if (session.user.alumniId) {
        await Alumni.findByIdAndUpdate(session.user.alumniId, { status: 'registered' });
      }
      
      // Update session object in memory so we don't repeat this for the same request
      session.user.lastLogin = now;
    }

    return session;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}

// Middleware: Require Logged In
export const requireAuth = async (request: any, reply: any) => {
  const session = await getSession(request);
  if (!session) {
    return reply.status(401).send({ status: 'error', message: 'Non authentifié' });
  }
  request.session = session;
};

// Middleware: Require Admin
export const requireAdmin = async (request: any, reply: any) => {
  const session = await getSession(request);
  if (!session) {
    return reply.status(401).send({ status: 'error', message: 'Non authentifié' });
  }
  if (session.user.role !== 'admin') {
    return reply.status(403).send({ status: 'error', message: 'Accès refusé : Administrateur uniquement' });
  }
  request.session = session;
};

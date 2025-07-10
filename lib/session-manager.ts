// Session manager for consistent session IDs across workflow steps
export class SessionManager {
  private static instance: SessionManager
  private sessions: Map<string, number> = new Map()

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // Generate a session ID for a user
  generateSessionId(userId: string): string {
    const timestamp = Date.now()
    return `session_${userId}_${timestamp}`
  }

  // Get or create a session ID for a user within a time window (30 minutes)
  getSessionId(userId: string, timeWindowMinutes: number = 30): string {
    const now = Date.now()
    const windowMs = timeWindowMinutes * 60 * 1000
    
    // Check if we have a recent session for this user
    for (const [sessionId, timestamp] of Array.from(this.sessions.entries())) {
      if (sessionId.startsWith(`session_${userId}_`) && (now - timestamp) < windowMs) {
        return sessionId
      }
    }
    
    // Create new session
    const newSessionId = this.generateSessionId(userId)
    this.sessions.set(newSessionId, now)
    return newSessionId
  }

  // Clean up old sessions
  cleanupOldSessions(maxAgeMinutes: number = 60): void {
    const now = Date.now()
    const maxAgeMs = maxAgeMinutes * 60 * 1000
    
    for (const [sessionId, timestamp] of Array.from(this.sessions.entries())) {
      if ((now - timestamp) > maxAgeMs) {
        this.sessions.delete(sessionId)
      }
    }
  }
}

// Helper function to get session ID for API routes
export function getSessionId(userId: string): string {
  const sessionManager = SessionManager.getInstance()
  return sessionManager.getSessionId(userId)
} 
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const db = require('../../models');

// Map to store active client instances
const sessions = new Map();

// Track reconnect attempts per lab to prevent infinite loops
const reconnectAttempts = new Map();
const MAX_RECONNECT_ATTEMPTS = 3;

// Helper to get auth directory for a lab
const getAuthDir = (labId) => {
  const authDir = path.join(__dirname, '../../../uploads/private/whatsapp_auth', `lab_${labId}`);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
};

class SessionManager {
  /**
   * Initialize a new WhatsApp session for a lab.
   * @param {string|number} labId - The lab's ID
   * @param {Function} onQrCallback - Called when a QR code is generated
   * @param {Function} onConnectedCallback - Called when the session connects
   * @param {Function} onDisconnectedCallback - Called when the session disconnects
   * @param {boolean} freshStart - If true, clears old auth data to force a new QR code
   */
  static async initSession(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback, freshStart = false) {
    // Normalize labId to string for consistent Map key lookups
    labId = String(labId);
    // If already connected, just return
    if (sessions.has(labId)) {
      const existingSession = sessions.get(labId);
      if (existingSession.state === 'connected') {
        if (onConnectedCallback) onConnectedCallback();
        return existingSession.sock;
      }
      // Clean up stale socket before creating a new one
      try {
        existingSession.sock.end(undefined);
      } catch (e) {
        // Socket may already be closed, ignore
      }
      sessions.delete(labId);
    }

    const authDir = getAuthDir(labId);

    // If this is a fresh connection attempt (user clicked "Connect"),
    // clear any stale auth data so Baileys generates a new QR code
    // instead of trying to resume a dead session
    if (freshStart && fs.existsSync(authDir)) {
      console.log(`[SessionManager] Fresh start requested for lab ${labId}, clearing old auth data`);
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
      reconnectAttempts.set(labId, 0); // Reset reconnect counter on fresh start
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    // Fetch the latest compatible WhatsApp version to prevent 405 rejections
    let version;
    try {
      const versionInfo = await fetchLatestBaileysVersion();
      version = versionInfo.version;
      console.log(`[SessionManager] Using WA version ${version.join('.')}, isLatest: ${versionInfo.isLatest}`);
    } catch (versionErr) {
      console.warn(`[SessionManager] Could not fetch latest WA version, using default:`, versionErr.message);
    }

    const socketOptions = {
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Lab Manager', 'Chrome', '1.0.0']
    };
    // Only pass version if we successfully fetched it
    if (version) socketOptions.version = version;

    const sock = makeWASocket(socketOptions);

    sessions.set(labId, { sock, state: 'initializing' });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // QR generated — reset reconnect counter since we're making progress
          reconnectAttempts.set(labId, 0);
          console.log(`[SessionManager] QR received for lab ${labId}`);
          if (onQrCallback) onQrCallback(qr);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log(`[SessionManager] Connection closed for lab ${labId}. Status code: ${statusCode}. Should reconnect: ${shouldReconnect}`);
          
          sessions.set(labId, { sock, state: 'disconnected' });
          
          try {
            await db.lab_whatsapp_account.update(
              { status: 'disconnected' },
              { where: { lab_id: labId, provider: 'web' } }
            );
          } catch (dbErr) {
            console.error(`[SessionManager] Failed to update DB status for lab ${labId}:`, dbErr.message);
          }

          if (onDisconnectedCallback) onDisconnectedCallback(shouldReconnect);

          if (shouldReconnect) {
            const attempts = (reconnectAttempts.get(labId) || 0) + 1;
            reconnectAttempts.set(labId, attempts);

            if (attempts <= MAX_RECONNECT_ATTEMPTS) {
              console.log(`[SessionManager] Reconnect attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS} for lab ${labId} in 5s...`);
              setTimeout(() => {
                // Pass freshStart=false for automatic reconnects to preserve auth state
                this.initSession(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback, false);
              }, 5000);
            } else {
              // Max attempts reached — stop looping and clean up stale auth
              console.log(`[SessionManager] Max reconnect attempts reached for lab ${labId}. Clearing stale auth and stopping.`);
              sessions.delete(labId);
              reconnectAttempts.delete(labId);
              fs.rmSync(authDir, { recursive: true, force: true });
            }
          } else {
            // Logged out explicitly, clean up
            sessions.delete(labId);
            reconnectAttempts.delete(labId);
            fs.rmSync(authDir, { recursive: true, force: true });
          }
        } else if (connection === 'open') {
          // Successfully connected — reset reconnect counter
          reconnectAttempts.set(labId, 0);
          sessions.set(labId, { sock, state: 'connected' });
          console.log(`[SessionManager] Lab ${labId} successfully connected to WhatsApp`);
          
          try {
            await db.lab_whatsapp_account.update(
              { status: 'connected' },
              { where: { lab_id: labId, provider: 'web' } }
            );
          } catch (dbErr) {
            console.error(`[SessionManager] Failed to update DB status for lab ${labId}:`, dbErr.message);
          }

          if (onConnectedCallback) onConnectedCallback();
        }
      } catch (err) {
        console.error(`[SessionManager] connection.update error for lab ${labId}:`, err);
      }
    });

    return sock;
  }

  static getSession(labId) {
    labId = String(labId);
    const session = sessions.get(labId);
    if (session && session.state === 'connected') {
      return session.sock;
    }
    return null;
  }

  /**
   * Attempt to restore a session from saved auth state (e.g., after server restart).
   * Returns true if the session was successfully re-established, false otherwise.
   * @param {string|number} labId
   * @param {number} timeoutMs - Max time to wait for connection (default: 15s)
   */
  static async restoreSession(labId, timeoutMs = 15000) {
    labId = String(labId);

    // Already connected — nothing to do
    const existing = sessions.get(labId);
    if (existing && existing.state === 'connected') return true;

    // Check if saved auth credentials exist on disk
    const authDir = getAuthDir(labId);
    const credsPath = path.join(authDir, 'creds.json');

    if (!fs.existsSync(credsPath)) {
      console.log(`[SessionManager] No saved auth for lab ${labId}, cannot restore`);
      return false;
    }

    console.log(`[SessionManager] Attempting to restore session for lab ${labId} from saved auth`);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`[SessionManager] Session restore timed out for lab ${labId}`);
        resolve(false);
      }, timeoutMs);

      this.initSession(
        labId,
        null, // No QR callback — this is an automatic restore, not user-initiated
        () => { clearTimeout(timeout); resolve(true); },  // onConnected
        () => { clearTimeout(timeout); resolve(false); },  // onDisconnected
        false // Don't clear auth — we want to resume the existing session
      ).catch((err) => {
        clearTimeout(timeout);
        console.error(`[SessionManager] Failed to restore session for lab ${labId}:`, err.message);
        resolve(false);
      });
    });
  }

  static getStatus(labId) {
    labId = String(labId);
    const session = sessions.get(labId);
    return session ? session.state : 'disconnected';
  }

  static async disconnectSession(labId) {
    labId = String(labId);
    const session = sessions.get(labId);
    if (session && session.sock) {
      try {
        await session.sock.logout();
      } catch (e) {
        console.error(`[SessionManager] Error during logout for lab ${labId}:`, e.message);
      }
      sessions.delete(labId);
      reconnectAttempts.delete(labId);
      const authDir = getAuthDir(labId);
      fs.rmSync(authDir, { recursive: true, force: true });
      try {
        await db.lab_whatsapp_account.update(
          { status: 'disconnected' },
          { where: { lab_id: labId, provider: 'web' } }
        );
      } catch (dbErr) {
        console.error(`[SessionManager] Failed to update DB on disconnect for lab ${labId}:`, dbErr.message);
      }
    }
  }
}

module.exports = SessionManager;

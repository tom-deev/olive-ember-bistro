/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — SUPABASE CLIENT, AUTH & DATABASE HELPER (js/supabase.js)
 * ============================================================================
 * Initializes a single shared official Supabase JavaScript SDK client
 * (@supabase/supabase-js v2) for browser use, with session persistence enabled.
 *
 * HOW TO CONFIGURE CREDENTIALS (NO BUILD STEP REQUIRED):
 * Option A (Recommended for local git safety):
 *   Create a file named `js/config.local.js` (already listed in `.gitignore`):
 *     window.OLIVE_EMBER_CONFIG = {
 *       supabaseUrl: 'https://xyzcompany.supabase.co',
 *       supabasePublishableKey: 'sb_publishable_...' // or legacy anon JWT key
 *     };
 *
 * Option B (Direct edit for quick testing):
 *   Replace the placeholder strings in `FALLBACK_CONFIG` below with your
 *   Supabase Project URL and Publishable / Anon key.
 *
 * SECURITY NOTICE:
 *   NEVER place your `service_role` or `sb_secret_...` key in browser files.
 *   Only use the public Publishable (`sb_publishable_...`) or `anon` key,
 *   backed by Supabase Row Level Security (RLS) policies in `supabase/schema.sql`.
 * ============================================================================
 */

(function initOliveEmberSupabase(globalScope) {
  'use strict';

  const FALLBACK_CONFIG = {
    supabaseUrl: 'https://your-project-ref.supabase.co',
    supabasePublishableKey: 'your-supabase-publishable-or-anon-key-here'
  };

  /**
   * Whitelist of allowed local pages for post-login redirects.
   * Prevents open-redirect vulnerabilities to external domains.
   */
  const ALLOWED_LOCAL_REDIRECTS = new Set([
    'reservation.html',
    'index.html',
    'menu.html',
    'about.html',
    'contact.html'
  ]);

  /**
   * Resolves configuration from optional `window.OLIVE_EMBER_CONFIG`
   * or falls back to the constants above.
   */
  function getRawConfig() {
    const externalConfig = globalScope.OLIVE_EMBER_CONFIG || {};
    return {
      supabaseUrl: (externalConfig.supabaseUrl || FALLBACK_CONFIG.supabaseUrl || '').trim(),
      supabasePublishableKey: (
        externalConfig.supabasePublishableKey ||
        externalConfig.supabaseKey ||
        FALLBACK_CONFIG.supabasePublishableKey ||
        ''
      ).trim()
    };
  }

  /**
   * Checks whether a key appears to be a privileged secret / service_role key
   * that must never be used in a browser client.
   */
  function isForbiddenSecretKey(key) {
    if (!key) return false;
    if (key.startsWith('sb_secret_')) return true;

    // Check if a JWT key payload contains `"role":"service_role"`
    const parts = key.split('.');
    if (parts.length === 3) {
      try {
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        if (payload && payload.role === 'service_role') {
          return true;
        }
      } catch (_err) {
        // Ignore base64 decode errors on non-JWT keys
      }
    }
    return false;
  }

  /**
   * Validates whether real, safe Supabase credentials have been configured.
   */
  function validateConfig(config) {
    const { supabaseUrl, supabasePublishableKey } = config;

    if (!supabaseUrl || !supabasePublishableKey) {
      return {
        isConfigured: false,
        reason: 'Supabase URL or publishable key is empty.'
      };
    }

    if (
      supabaseUrl.includes('your-project-ref') ||
      supabasePublishableKey.includes('your-supabase-')
    ) {
      return {
        isConfigured: false,
        reason: 'Placeholder Supabase credentials are still in place.'
      };
    }

    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
      return {
        isConfigured: false,
        reason: 'Supabase URL must match https://<project-ref>.supabase.co'
      };
    }

    if (isForbiddenSecretKey(supabasePublishableKey)) {
      console.error(
        '[Olive & Ember Security Error] A Supabase service_role or secret key was detected in browser configuration. Client initialization has been blocked. Use ONLY your public publishable or anon key.'
      );
      return {
        isConfigured: false,
        reason: 'Blocked unsafe secret/service_role key in browser.'
      };
    }

    return {
      isConfigured: true,
      reason: null
    };
  }

  const rawConfig = getRawConfig();
  const validation = validateConfig(rawConfig);
  let supabaseClient = null;

  if (validation.isConfigured) {
    if (globalScope.supabase && typeof globalScope.supabase.createClient === 'function') {
      try {
        supabaseClient = globalScope.supabase.createClient(
          rawConfig.supabaseUrl,
          rawConfig.supabasePublishableKey,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        );
      } catch (err) {
        console.error('[Olive & Ember] Failed to initialize Supabase client:', err);
      }
    } else {
      console.warn(
        '[Olive & Ember] Supabase credentials are set, but the @supabase/supabase-js CDN script failed to load.'
      );
    }
  }

  /**
   * Sanitizes a requested redirect target so only known local pages on this
   * website are allowed. Rejects any external URL, protocol-relative URL, or path traversal.
   */
  function getSafeRedirectPath(rawTarget, fallbackPage) {
    const defaultTarget = fallbackPage || 'reservation.html';
    if (!rawTarget || typeof rawTarget !== 'string') {
      return defaultTarget;
    }

    const trimmed = rawTarget.trim();
    if (
      !trimmed ||
      trimmed.includes('://') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('\\') ||
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.includes('..')
    ) {
      return defaultTarget;
    }

    const cleaned = trimmed.replace(/^\/+/, '');
    const [pagePart, hashPart] = cleaned.split('#');
    const basePage = pagePart.split('?')[0];

    if (!ALLOWED_LOCAL_REDIRECTS.has(basePage)) {
      return defaultTarget;
    }

    if (hashPart && /^[a-zA-Z0-9_-]+$/.test(hashPart)) {
      return basePage + '#' + hashPart;
    }

    return basePage;
  }

  /**
   * Builds a safe absolute URL on the current origin for Supabase email redirect links.
   */
  function buildLocalAbsoluteUrl(relativePage) {
    const safePage = getSafeRedirectPath(relativePage, 'reservation.html');
    try {
      const basePath = globalScope.location.pathname.replace(/[^/]*$/, '');
      return globalScope.location.origin + basePath + safePage;
    } catch (_err) {
      return safePage;
    }
  }

  /**
   * Extracts a concise, safe first name for the navigation indicator.
   * Note: User metadata is used strictly for UI display, never for authorization.
   */
  function getCustomerFirstName(user) {
    if (!user) return '';
    const fullName =
      user.user_metadata && typeof user.user_metadata.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : '';

    if (fullName) {
      const firstToken = fullName.split(/\s+/)[0];
      return firstToken.slice(0, 24);
    }

    if (typeof user.email === 'string' && user.email.includes('@')) {
      return user.email.split('@')[0].slice(0, 20);
    }

    return 'Guest';
  }

  /**
   * Returns the current Supabase session and authenticated user, if any.
   */
  async function getSessionState() {
    if (!supabaseClient) {
      return {
        session: null,
        user: null,
        error: new Error(validation.reason || 'Supabase is not configured.'),
        isConfigured: false
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        return { session: null, user: null, error, isConfigured: true };
      }
      const session = data ? data.session : null;
      const user = session ? session.user : null;
      return { session, user, error: null, isConfigured: true };
    } catch (err) {
      return { session: null, user: null, error: err, isConfigured: true };
    }
  }

  /**
   * Registers a new customer account using Supabase Auth email & password.
   * Stores `full_name` in user_metadata for display convenience only.
   */
  async function signUpCustomer(params) {
    if (!supabaseClient) {
      return {
        user: null,
        session: null,
        requiresEmailVerification: false,
        error: new Error(
          'Supabase authentication is not configured yet. Please configure your Supabase Project URL and Publishable Key (see README.md).'
        ),
        isConfigured: false
      };
    }

    const fullName = (params.fullName || '').trim();
    const email = (params.email || '').trim();
    const password = params.password || '';
    const redirectTarget = getSafeRedirectPath(params.redirectPath, 'reservation.html');

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: buildLocalAbsoluteUrl(redirectTarget)
        }
      });

      if (error) {
        return {
          user: null,
          session: null,
          requiresEmailVerification: false,
          error: error,
          isConfigured: true
        };
      }

      const user = data ? data.user : null;
      const session = data ? data.session : null;

      // Detect Supabase obfuscated response when an email is already registered
      const isExistingAccountObfuscated = Boolean(
        user && Array.isArray(user.identities) && user.identities.length === 0
      );

      // When email confirmation is enabled in Supabase, data.user is returned without data.session
      const requiresEmailVerification = Boolean(user && !session);

      return {
        user: user,
        session: session,
        requiresEmailVerification: requiresEmailVerification,
        isExistingAccountObfuscated: isExistingAccountObfuscated,
        error: null,
        isConfigured: true
      };
    } catch (networkErr) {
      return {
        user: null,
        session: null,
        requiresEmailVerification: false,
        error: networkErr,
        isConfigured: true
      };
    }
  }

  /**
   * Signs in an existing customer with email and password.
   */
  async function signInCustomer(params) {
    if (!supabaseClient) {
      return {
        user: null,
        session: null,
        error: new Error(
          'Supabase authentication is not configured yet. Please configure your Supabase Project URL and Publishable Key (see README.md).'
        ),
        isConfigured: false
      };
    }

    const email = (params.email || '').trim();
    const password = params.password || '';

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: error,
          isConfigured: true
        };
      }

      const session = data ? data.session : null;
      const user = data ? data.user : null;

      return {
        user: user,
        session: session,
        error: null,
        isConfigured: true
      };
    } catch (networkErr) {
      return {
        user: null,
        session: null,
        error: networkErr,
        isConfigured: true
      };
    }
  }

  /**
   * Signs out the current customer session.
   */
  async function signOutCustomer() {
    if (!supabaseClient) {
      return { error: null };
    }
    try {
      const { error } = await supabaseClient.auth.signOut();
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * Initiates the Supabase password recovery email flow.
   */
  async function sendPasswordResetEmail(email) {
    if (!supabaseClient) {
      return {
        error: new Error(
          'Supabase authentication is not configured yet. Please configure your Supabase Project URL and Publishable Key (see README.md).'
        ),
        isConfigured: false
      };
    }

    try {
      let resetRedirectUrl = buildLocalAbsoluteUrl('reset-password.html');
      try {
        const origin = globalScope.location.origin;
        const basePath = globalScope.location.pathname.replace(/[^/]*$/, '');
        resetRedirectUrl = origin + basePath + 'reset-password.html';
      } catch (_e) {
        // Fallback to relative if origin unavailable
      }

      const { error } = await supabaseClient.auth.resetPasswordForEmail(
        (email || '').trim(),
        {
          redirectTo: resetRedirectUrl
        }
      );

      return { error: error || null, isConfigured: true };
    } catch (networkErr) {
      return { error: networkErr, isConfigured: true };
    }
  }

  /**
   * Updates the authenticated user's password during a recovery session.
   */
  async function updateCustomerPassword(newPassword) {
    if (!supabaseClient) {
      return {
        user: null,
        error: new Error('Supabase authentication is not configured.'),
        isConfigured: false
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { user: null, error: error, isConfigured: true };
      }

      return { user: data ? data.user : null, error: null, isConfigured: true };
    } catch (networkErr) {
      return { user: null, error: networkErr, isConfigured: true };
    }
  }

  /**
   * Subscribes to Supabase auth state changes (`SIGNED_IN`, `SIGNED_OUT`,
   * `PASSWORD_RECOVERY`, `TOKEN_REFRESHED`, `USER_UPDATED`).
   */
  function subscribeToAuthChanges(listener) {
    if (!supabaseClient || typeof listener !== 'function') {
      return { unsubscribe: function () {} };
    }

    const { data } = supabaseClient.auth.onAuthStateChange(function (event, session) {
      listener(event, session, session ? session.user : null);
    });

    return {
      unsubscribe: function () {
        if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') {
          data.subscription.unsubscribe();
        }
      }
    };
  }

  /**
   * Fetches available menu items from the `menu_items` table in Supabase.
   * Returns `{ data, error, isConfigured }`.
   */
  async function fetchMenuItemsFromSupabase() {
    if (!supabaseClient) {
      return {
        data: null,
        error: new Error(validation.reason || 'Supabase client is not configured.'),
        isConfigured: false
      };
    }

    try {
      const { data, error } = await supabaseClient
        .from('menu_items')
        .select('id, name, description, category, price, image_url, is_vegetarian, is_available, created_at')
        .eq('is_available', true)
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error, isConfigured: true };
      }

      return { data: Array.isArray(data) ? data : [], error: null, isConfigured: true };
    } catch (networkErr) {
      return { data: null, error: networkErr, isConfigured: true };
    }
  }

  /**
   * Inserts a validated reservation request into the `reservations` table.
   * SECURITY: Requires an active authenticated Supabase session. The `user_id`
   * is ALWAYS taken from `session.user.id` and never trusted from form inputs.
   */
  async function insertReservationInSupabase(reservationPayload) {
    if (!supabaseClient) {
      return {
        success: false,
        code: 'UNCONFIGURED',
        error: new Error(
          'Supabase database connection is not configured yet. Please configure your Supabase Project URL and Publishable Key (see README.md) to sign in and submit live reservations.'
        ),
        isConfigured: false
      };
    }

    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      const session = sessionData ? sessionData.session : null;
      const authenticatedUser = session ? session.user : null;

      if (sessionError || !authenticatedUser || !authenticatedUser.id) {
        const authErr = new Error(
          'You must be signed in to your Olive & Ember account before submitting a reservation request.'
        );
        authErr.code = 'AUTH_REQUIRED';
        return {
          success: false,
          code: 'AUTH_REQUIRED',
          error: authErr,
          isConfigured: true
        };
      }

      const { error } = await supabaseClient
        .from('reservations')
        .insert([
          {
            user_id: authenticatedUser.id,
            full_name: reservationPayload.full_name,
            email: reservationPayload.email,
            phone: reservationPayload.phone,
            reservation_date: reservationPayload.reservation_date,
            reservation_time: reservationPayload.reservation_time,
            guests: reservationPayload.guests,
            special_requests: reservationPayload.special_requests || null,
            status: 'pending'
          }
        ]);

      if (error) {
        return { success: false, code: error.code || 'DB_ERROR', error, isConfigured: true };
      }

      return { success: true, code: 'OK', error: null, isConfigured: true };
    } catch (networkErr) {
      return { success: false, code: 'NETWORK_ERROR', error: networkErr, isConfigured: true };
    }
  }

  /**
   * Fetches only the currently authenticated customer's own reservation requests.
   * Enforced both by `.eq('user_id', authenticatedUser.id)` and PostgreSQL RLS.
   */
  async function fetchCustomerReservationsFromSupabase() {
    if (!supabaseClient) {
      return {
        data: [],
        error: null,
        isAuthenticated: false,
        isConfigured: false
      };
    }

    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      const session = sessionData ? sessionData.session : null;
      const authenticatedUser = session ? session.user : null;

      if (sessionError || !authenticatedUser || !authenticatedUser.id) {
        return {
          data: [],
          error: null,
          isAuthenticated: false,
          isConfigured: true
        };
      }

      const { data, error } = await supabaseClient
        .from('reservations')
        .select('id, reservation_date, reservation_time, guests, status, created_at')
        .eq('user_id', authenticatedUser.id)
        .order('reservation_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        return {
          data: [],
          error: error,
          isAuthenticated: true,
          isConfigured: true
        };
      }

      return {
        data: Array.isArray(data) ? data : [],
        error: null,
        isAuthenticated: true,
        isConfigured: true
      };
    } catch (networkErr) {
      return {
        data: [],
        error: networkErr,
        isAuthenticated: true,
        isConfigured: true
      };
    }
  }

  const authHelper = {
    isConfigured: Boolean(supabaseClient),
    getSafeRedirectPath: getSafeRedirectPath,
    getCustomerFirstName: getCustomerFirstName,
    getSession: getSessionState,
    signUp: signUpCustomer,
    signIn: signInCustomer,
    signOut: signOutCustomer,
    sendPasswordResetEmail: sendPasswordResetEmail,
    updatePassword: updateCustomerPassword,
    onAuthStateChange: subscribeToAuthChanges
  };

  globalScope.OliveEmberAuth = authHelper;

  globalScope.OliveEmberDB = {
    isConfigured: Boolean(supabaseClient),
    statusReason: validation.reason,
    getClient: function () {
      return supabaseClient;
    },
    fetchMenuItems: fetchMenuItemsFromSupabase,
    submitReservation: insertReservationInSupabase,
    fetchMyReservations: fetchCustomerReservationsFromSupabase,
    auth: authHelper
  };
})(window);

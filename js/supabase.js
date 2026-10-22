/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — SUPABASE CLIENT & DATABASE HELPER (js/supabase.js)
 * ============================================================================
 * Initializes the official Supabase JavaScript SDK (@supabase/supabase-js v2)
 * for browser use.
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
              persistSession: false,
              autoRefreshToken: false
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
   * Note: We intentionally do NOT chain `.select()` after `.insert()` because
   * public (`anon`) visitors have INSERT-only RLS permission and cannot read rows
   * from `reservations`.
   */
  async function insertReservationInSupabase(reservationPayload) {
    if (!supabaseClient) {
      return {
        success: false,
        error: new Error(
          'Supabase database connection is not configured yet. Please configure your Supabase Project URL and Publishable Key (see README.md) to submit live reservations.'
        ),
        isConfigured: false
      };
    }

    try {
      const { error } = await supabaseClient
        .from('reservations')
        .insert([
          {
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
        return { success: false, error, isConfigured: true };
      }

      return { success: true, error: null, isConfigured: true };
    } catch (networkErr) {
      return { success: false, error: networkErr, isConfigured: true };
    }
  }

  globalScope.OliveEmberDB = {
    isConfigured: Boolean(supabaseClient),
    statusReason: validation.reason,
    getClient: function () {
      return supabaseClient;
    },
    fetchMenuItems: fetchMenuItemsFromSupabase,
    submitReservation: insertReservationInSupabase
  };
})(window);

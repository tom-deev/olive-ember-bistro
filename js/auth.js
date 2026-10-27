/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — AUTHENTICATION PAGE CONTROLLER (js/auth.js)
 * ============================================================================
 * Handles:
 *  - Login form validation, Supabase signInWithPassword & safe local redirect
 *  - Signup form validation, Supabase signUp, full_name metadata & email
 *    verification state handling
 *  - Password recovery request (resetPasswordForEmail) & new password update
 *    (updateUser)
 *  - Accessible show/hide password controls
 * ============================================================================
 */

(function initOliveEmberAuthPages(globalScope) {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MIN_PASSWORD_LENGTH = 8;

  /**
   * Resolves a safe local redirect path from `?redirect=...` or sessionStorage.
   * Always falls back to `reservation.html` and rejects external URLs.
   */
  function resolveIntendedRedirect() {
    const sanitize =
      globalScope.OliveEmberAuth &&
      typeof globalScope.OliveEmberAuth.getSafeRedirectPath === 'function'
        ? globalScope.OliveEmberAuth.getSafeRedirectPath
        : function (_raw, fallback) {
            return fallback || 'reservation.html';
          };

    try {
      const params = new URLSearchParams(globalScope.location.search);
      const queryRedirect = params.get('redirect');
      if (queryRedirect) {
        return sanitize(queryRedirect, 'reservation.html');
      }
    } catch (_err) {
      // Ignore URLSearchParams errors
    }

    try {
      const storedRedirect = sessionStorage.getItem('oe_post_auth_redirect');
      if (storedRedirect) {
        return sanitize(storedRedirect, 'reservation.html');
      }
    } catch (_err) {
      // Ignore sessionStorage errors
    }

    return 'reservation.html';
  }

  /**
   * Preserves the safe `?redirect=...` query parameter on cross-links between
   * `login.html` and `signup.html`.
   */
  function syncAuthCrossLinks() {
    const safeRedirect = resolveIntendedRedirect();
    if (!safeRedirect || safeRedirect === 'reservation.html') {
      try {
        const params = new URLSearchParams(globalScope.location.search);
        if (!params.get('redirect')) {
          return;
        }
      } catch (_err) {
        return;
      }
    }

    const crossLinks = document.querySelectorAll('[data-preserve-redirect]');
    crossLinks.forEach(function (link) {
      const baseHref = (link.getAttribute('href') || '').split('?')[0];
      if (baseHref) {
        link.setAttribute(
          'href',
          baseHref + '?redirect=' + encodeURIComponent(safeRedirect)
        );
      }
    });
  }

  /**
   * Binds accessible Show / Hide password toggle buttons.
   */
  function initPasswordVisibilityToggles() {
    const toggleButtons = document.querySelectorAll('[data-toggle-password]');
    toggleButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-toggle-password');
        const input = targetId ? document.getElementById(targetId) : null;
        if (!input) {
          return;
        }

        const isCurrentlyHidden = input.type === 'password';
        input.type = isCurrentlyHidden ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(isCurrentlyHidden));
        btn.setAttribute(
          'aria-label',
          isCurrentlyHidden ? 'Hide password' : 'Show password'
        );
        btn.textContent = isCurrentlyHidden ? 'Hide' : 'Show';
      });
    });
  }

  /**
   * Sets or clears an accessible inline field validation error.
   */
  function setFieldError(inputId, errorId, message) {
    const inputEl = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);

    if (inputEl) {
      if (message) {
        inputEl.setAttribute('aria-invalid', 'true');
      } else {
        inputEl.removeAttribute('aria-invalid');
      }
    }

    if (errorEl) {
      errorEl.textContent = message || '';
    }
  }

  /**
   * Displays an accessible status banner inside a form card.
   */
  function showStatusBanner(bannerId, type, titleText, bodyText, actionLink) {
    const banner = document.getElementById(bannerId);
    if (!banner) {
      return;
    }

    banner.className = 'form-status form-status--' + type;
    banner.innerHTML = '';

    const strong = document.createElement('strong');
    strong.textContent = titleText + ' ';
    banner.appendChild(strong);

    const span = document.createElement('span');
    span.textContent = bodyText;
    banner.appendChild(span);

    if (actionLink && actionLink.href && actionLink.label) {
      const linkWrap = document.createElement('div');
      linkWrap.style.marginTop = '0.65rem';
      const anchor = document.createElement('a');
      anchor.href = actionLink.href;
      anchor.className = 'text-link';
      anchor.textContent = actionLink.label;
      linkWrap.appendChild(anchor);
      banner.appendChild(linkWrap);
    }

    banner.hidden = false;
    banner.focus();
  }

  /**
   * Renders a discreet Supabase readiness banner on auth pages.
   */
  function initAuthConnectionIndicator() {
    const indicator = document.getElementById('auth-db-indicator');
    if (!indicator) {
      return;
    }

    if (globalScope.OliveEmberAuth && globalScope.OliveEmberAuth.isConfigured) {
      indicator.hidden = true;
    } else {
      indicator.className = 'data-source-banner';
      indicator.innerHTML =
        '<span><strong>Supabase Auth Setup Required for Live Sign-In:</strong> Form validation works immediately. Configure your Supabase Project URL and Publishable Key in <code>js/supabase.js</code> or <code>js/config.local.js</code> (see <code>README.md</code>) to enable live customer authentication.</span>';
      indicator.hidden = false;
    }
  }

  /**
   * Initializes the Login form (`#login-form` on `login.html`).
   */
  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) {
      return;
    }

    let isSubmitting = false;
    const submitBtn = document.getElementById('login-submit-btn');

    // Show notice if redirected from a protected reservation action
    try {
      const params = new URLSearchParams(globalScope.location.search);
      if (params.get('redirect')) {
        showStatusBanner(
          'login-status',
          'info',
          'Sign In Required:',
          'Please sign in to your Olive & Ember account (or create one below) to request a table reservation.'
        );
      }
    } catch (_err) {
      // Ignore query param errors
    }

    ['login-email', 'login-password'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          setFieldError(id, id + '-error', '');
        });
      }
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      const statusEl = document.getElementById('login-status');
      if (statusEl) {
        statusEl.hidden = true;
      }

      const email = (document.getElementById('login-email')?.value || '').trim();
      const password = document.getElementById('login-password')?.value || '';

      let isValid = true;

      if (!email) {
        setFieldError('login-email', 'login-email-error', 'Please enter your email address.');
        isValid = false;
      } else if (!EMAIL_REGEX.test(email)) {
        setFieldError(
          'login-email',
          'login-email-error',
          'Please enter a valid email address (for example, name@example.com).'
        );
        isValid = false;
      } else {
        setFieldError('login-email', 'login-email-error', '');
      }

      if (!password) {
        setFieldError('login-password', 'login-password-error', 'Please enter your password.');
        isValid = false;
      } else {
        setFieldError('login-password', 'login-password-error', '');
      }

      if (!isValid) {
        showStatusBanner(
          'login-status',
          'error',
          'Please check your details:',
          'Enter a valid email address and password to sign in.'
        );
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      isSubmitting = true;
      const originalText = submitBtn ? submitBtn.textContent : 'Sign In';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In…';
      }

      try {
        if (!globalScope.OliveEmberAuth) {
          throw new Error('Authentication module (js/supabase.js) is unavailable.');
        }

        const result = await globalScope.OliveEmberAuth.signIn({
          email: email,
          password: password
        });

        if (result.error) {
          const rawMsg = result.error.message || 'Unable to sign in with those credentials.';
          const isUnverified = /email.*not.*confirmed/i.test(rawMsg);

          if (isUnverified) {
            showStatusBanner(
              'login-status',
              'info',
              'Email Verification Required:',
              'Your account has been created, but your email address has not been verified yet. Please open the verification link sent to your inbox before signing in to book a table.'
            );
          } else {
            showStatusBanner('login-status', 'error', 'Sign-In Failed:', rawMsg);
          }
          return;
        }

        if (!result.session || !result.user) {
          showStatusBanner(
            'login-status',
            'info',
            'Email Verification Required:',
            'Please verify your email address using the link sent to your inbox before signing in to request a reservation.'
          );
          return;
        }

        const targetPage = resolveIntendedRedirect();
        try {
          sessionStorage.removeItem('oe_post_auth_redirect');
        } catch (_err) {
          // Ignore storage error
        }

        showStatusBanner(
          'login-status',
          'success',
          'Signed In Successfully:',
          'Welcome back! Redirecting you to ' + targetPage + '…'
        );

        setTimeout(function () {
          globalScope.location.href = targetPage;
        }, 350);
      } catch (err) {
        showStatusBanner(
          'login-status',
          'error',
          'Unexpected Sign-In Error:',
          err.message || 'A network error occurred while signing in.'
        );
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  /**
   * Initializes the Signup form (`#signup-form` on `signup.html`).
   */
  function initSignupForm() {
    const form = document.getElementById('signup-form');
    if (!form) {
      return;
    }

    let isSubmitting = false;
    const submitBtn = document.getElementById('signup-submit-btn');

    ['signup-name', 'signup-email', 'signup-password', 'signup-confirm-password'].forEach(
      function (id) {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', function () {
            setFieldError(id, id + '-error', '');
          });
        }
      }
    );

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      const statusEl = document.getElementById('signup-status');
      if (statusEl) {
        statusEl.hidden = true;
      }

      const fullName = (document.getElementById('signup-name')?.value || '').trim();
      const email = (document.getElementById('signup-email')?.value || '').trim();
      const password = document.getElementById('signup-password')?.value || '';
      const confirmPassword = document.getElementById('signup-confirm-password')?.value || '';

      let isValid = true;

      if (!fullName) {
        setFieldError('signup-name', 'signup-name-error', 'Please enter your full name.');
        isValid = false;
      } else if (fullName.length < 2 || fullName.length > 120) {
        setFieldError(
          'signup-name',
          'signup-name-error',
          'Full name must be between 2 and 120 characters.'
        );
        isValid = false;
      } else {
        setFieldError('signup-name', 'signup-name-error', '');
      }

      if (!email) {
        setFieldError('signup-email', 'signup-email-error', 'Please enter your email address.');
        isValid = false;
      } else if (!EMAIL_REGEX.test(email) || email.length > 254) {
        setFieldError(
          'signup-email',
          'signup-email-error',
          'Please enter a valid email address (for example, name@example.com).'
        );
        isValid = false;
      } else {
        setFieldError('signup-email', 'signup-email-error', '');
      }

      if (!password) {
        setFieldError('signup-password', 'signup-password-error', 'Please create a password.');
        isValid = false;
      } else if (password.length < MIN_PASSWORD_LENGTH) {
        setFieldError(
          'signup-password',
          'signup-password-error',
          'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters long.'
        );
        isValid = false;
      } else {
        setFieldError('signup-password', 'signup-password-error', '');
      }

      if (!confirmPassword) {
        setFieldError(
          'signup-confirm-password',
          'signup-confirm-password-error',
          'Please confirm your password.'
        );
        isValid = false;
      } else if (confirmPassword !== password) {
        setFieldError(
          'signup-confirm-password',
          'signup-confirm-password-error',
          'Passwords do not match. Please re-enter both passwords.'
        );
        isValid = false;
      } else {
        setFieldError('signup-confirm-password', 'signup-confirm-password-error', '');
      }

      if (!isValid) {
        showStatusBanner(
          'signup-status',
          'error',
          'Please review your registration details:',
          'Fix the highlighted fields below before creating your account.'
        );
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      isSubmitting = true;
      const originalText = submitBtn ? submitBtn.textContent : 'Create Account';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account…';
      }

      try {
        if (!globalScope.OliveEmberAuth) {
          throw new Error('Authentication module (js/supabase.js) is unavailable.');
        }

        const redirectTarget = resolveIntendedRedirect();
        const result = await globalScope.OliveEmberAuth.signUp({
          fullName: fullName,
          email: email,
          password: password,
          redirectPath: redirectTarget
        });

        if (result.error) {
          showStatusBanner(
            'signup-status',
            'error',
            'Registration Could Not Be Completed:',
            result.error.message || 'Unable to register your account at this time.'
          );
          return;
        }

        if (result.isExistingAccountObfuscated) {
          showStatusBanner(
            'signup-status',
            'info',
            'Account May Already Exist:',
            'If this email is already registered with Olive & Ember, please sign in or reset your password.',
            {
              href: 'login.html?redirect=' + encodeURIComponent(redirectTarget),
              label: 'Go to Sign In →'
            }
          );
          return;
        }

        if (result.requiresEmailVerification) {
          form.reset();
          showStatusBanner(
            'signup-status',
            'info',
            'Verify Your Email Address to Continue:',
            'We have sent a verification link to ' +
              email +
              '. Please click the confirmation link in your email to activate your account. You will be able to sign in and request a table reservation once verification is complete.',
            {
              href: 'login.html?redirect=' + encodeURIComponent(redirectTarget),
              label: 'Return to Sign In →'
            }
          );
          return;
        }

        if (result.session && result.user) {
          form.reset();
          try {
            sessionStorage.removeItem('oe_post_auth_redirect');
          } catch (_err) {
            // Ignore storage error
          }

          showStatusBanner(
            'signup-status',
            'success',
            'Account Created & Signed In:',
            'Welcome to Olive & Ember, ' +
              fullName +
              '! Redirecting you to ' +
              redirectTarget +
              '…'
          );

          setTimeout(function () {
            globalScope.location.href = redirectTarget;
          }, 450);
        }
      } catch (err) {
        showStatusBanner(
          'signup-status',
          'error',
          'Unexpected Registration Error:',
          err.message || 'A network error occurred while creating your account.'
        );
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  /**
   * Initializes the Password Recovery flow (`reset-password.html`).
   * Supports both Step 1 (requesting a recovery email) and Step 2 (setting a new
   * password after arriving via a Supabase recovery link).
   */
  function initPasswordResetPage() {
    const requestPanel = document.getElementById('reset-request-panel');
    const updatePanel = document.getElementById('reset-update-panel');
    if (!requestPanel || !updatePanel) {
      return;
    }

    function switchToUpdatePasswordMode() {
      requestPanel.hidden = true;
      updatePanel.hidden = false;
    }

    // Detect if URL contains a Supabase recovery hash/query parameter
    const rawHash = globalScope.location.hash || '';
    const rawSearch = globalScope.location.search || '';
    if (
      rawHash.includes('type=recovery') ||
      rawSearch.includes('type=recovery') ||
      rawSearch.includes('mode=update')
    ) {
      switchToUpdatePasswordMode();
    }

    // Also listen for Supabase PASSWORD_RECOVERY event
    if (globalScope.OliveEmberAuth) {
      globalScope.OliveEmberAuth.onAuthStateChange(function (event) {
        if (event === 'PASSWORD_RECOVERY') {
          switchToUpdatePasswordMode();
        }
      });
    }

    // 1. Request Reset Link Form
    const requestForm = document.getElementById('reset-request-form');
    const requestSubmitBtn = document.getElementById('reset-request-btn');
    let isRequesting = false;

    const emailInput = document.getElementById('reset-email');
    if (emailInput) {
      emailInput.addEventListener('input', function () {
        setFieldError('reset-email', 'reset-email-error', '');
      });
    }

    if (requestForm) {
      requestForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (isRequesting) {
          return;
        }

        const statusEl = document.getElementById('reset-request-status');
        if (statusEl) {
          statusEl.hidden = true;
        }

        const email = (document.getElementById('reset-email')?.value || '').trim();
        if (!email) {
          setFieldError('reset-email', 'reset-email-error', 'Please enter your email address.');
          emailInput?.focus();
          return;
        }
        if (!EMAIL_REGEX.test(email)) {
          setFieldError(
            'reset-email',
            'reset-email-error',
            'Please enter a valid email address (for example, name@example.com).'
          );
          emailInput?.focus();
          return;
        }
        setFieldError('reset-email', 'reset-email-error', '');

        isRequesting = true;
        const origText = requestSubmitBtn ? requestSubmitBtn.textContent : 'Send Reset Link';
        if (requestSubmitBtn) {
          requestSubmitBtn.disabled = true;
          requestSubmitBtn.textContent = 'Sending Instructions…';
        }

        try {
          if (!globalScope.OliveEmberAuth) {
            throw new Error('Authentication module (js/supabase.js) is unavailable.');
          }

          const result = await globalScope.OliveEmberAuth.sendPasswordResetEmail(email);

          if (!result.isConfigured) {
            showStatusBanner(
              'reset-request-status',
              'error',
              'Password Reset Unavailable:',
              result.error
                ? result.error.message
                : 'Supabase authentication is not configured yet.'
            );
            return;
          }

          if (result.error) {
            showStatusBanner(
              'reset-request-status',
              'error',
              'Request Could Not Be Processed:',
              result.error.message || 'Unable to send password recovery instructions right now.'
            );
            return;
          }

          requestForm.reset();
          // Neutral confirmation message that does not reveal account existence
          showStatusBanner(
            'reset-request-status',
            'success',
            'Check Your Email Inbox:',
            'If an account is associated with that email address, we have sent a password reset link. Please check your inbox and spam folder, and follow the link to set a new password.',
            {
              href: 'login.html',
              label: 'Return to Sign In →'
            }
          );
        } catch (err) {
          showStatusBanner(
            'reset-request-status',
            'error',
            'Unexpected Error:',
            err.message || 'A network error occurred.'
          );
        } finally {
          isRequesting = false;
          if (requestSubmitBtn) {
            requestSubmitBtn.disabled = false;
            requestSubmitBtn.textContent = origText;
          }
        }
      });
    }

    // 2. Update Password Form (when user arrives via recovery link)
    const updateForm = document.getElementById('reset-update-form');
    const updateSubmitBtn = document.getElementById('reset-update-btn');
    let isUpdating = false;

    ['reset-new-password', 'reset-confirm-password'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          setFieldError(id, id + '-error', '');
        });
      }
    });

    if (updateForm) {
      updateForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (isUpdating) {
          return;
        }

        const statusEl = document.getElementById('reset-update-status');
        if (statusEl) {
          statusEl.hidden = true;
        }

        const newPassword = document.getElementById('reset-new-password')?.value || '';
        const confirmPassword = document.getElementById('reset-confirm-password')?.value || '';

        let isValid = true;

        if (!newPassword) {
          setFieldError(
            'reset-new-password',
            'reset-new-password-error',
            'Please enter a new password.'
          );
          isValid = false;
        } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
          setFieldError(
            'reset-new-password',
            'reset-new-password-error',
            'New password must be at least ' + MIN_PASSWORD_LENGTH + ' characters long.'
          );
          isValid = false;
        } else {
          setFieldError('reset-new-password', 'reset-new-password-error', '');
        }

        if (!confirmPassword) {
          setFieldError(
            'reset-confirm-password',
            'reset-confirm-password-error',
            'Please confirm your new password.'
          );
          isValid = false;
        } else if (confirmPassword !== newPassword) {
          setFieldError(
            'reset-confirm-password',
            'reset-confirm-password-error',
            'Passwords do not match.'
          );
          isValid = false;
        } else {
          setFieldError('reset-confirm-password', 'reset-confirm-password-error', '');
        }

        if (!isValid) {
          const firstInvalid = updateForm.querySelector('[aria-invalid="true"]');
          if (firstInvalid) {
            firstInvalid.focus();
          }
          return;
        }

        isUpdating = true;
        const origText = updateSubmitBtn ? updateSubmitBtn.textContent : 'Update Password';
        if (updateSubmitBtn) {
          updateSubmitBtn.disabled = true;
          updateSubmitBtn.textContent = 'Updating Password…';
        }

        try {
          if (!globalScope.OliveEmberAuth) {
            throw new Error('Authentication module (js/supabase.js) is unavailable.');
          }

          const { session } = await globalScope.OliveEmberAuth.getSession();
          if (!session) {
            showStatusBanner(
              'reset-update-status',
              'error',
              'Recovery Session Required:',
              'Your password recovery link has expired or is missing. Please request a new password reset link.',
              {
                href: 'reset-password.html',
                label: 'Request a New Reset Link →'
              }
            );
            return;
          }

          const result = await globalScope.OliveEmberAuth.updatePassword(newPassword);

          if (result.error) {
            showStatusBanner(
              'reset-update-status',
              'error',
              'Could Not Update Password:',
              result.error.message || 'Unable to update your password.'
            );
            return;
          }

          updateForm.reset();
          showStatusBanner(
            'reset-update-status',
            'success',
            'Password Updated Successfully:',
            'Your password has been changed. You can now proceed to book a table.',
            {
              href: 'reservation.html',
              label: 'Continue to Table Reservations →'
            }
          );
        } catch (err) {
          showStatusBanner(
            'reset-update-status',
            'error',
            'Unexpected Error:',
            err.message || 'A network error occurred.'
          );
        } finally {
          isUpdating = false;
          if (updateSubmitBtn) {
            updateSubmitBtn.disabled = false;
            updateSubmitBtn.textContent = origText;
          }
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncAuthCrossLinks();
    initPasswordVisibilityToggles();
    initAuthConnectionIndicator();
    initLoginForm();
    initSignupForm();
    initPasswordResetPage();
  });
})(window);

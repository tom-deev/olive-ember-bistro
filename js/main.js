/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — GLOBAL UI, NAVIGATION & AUTH STATE (js/main.js)
 * ============================================================================
 * Handles:
 *  - Accessible mobile navigation toggle & keyboard Escape handling
 *  - Sticky navigation elevation on scroll
 *  - Navigation authentication state (Login / Sign Up vs. First Name + Logout)
 *  - Protecting "Book a Table" / reservation links for unauthenticated visitors
 *  - Graceful image error fallbacks (no broken image icons)
 *  - Automatic footer copyright year
 *  - Contact page form client-side validation & transparent demo feedback
 * ============================================================================
 */

(function initOliveEmberMain(globalScope) {
  'use strict';

  const FALLBACK_DISH_IMAGE = 'assets/images/fallback-dish.svg';
  const FALLBACK_EDITORIAL_IMAGE = 'assets/images/fallback-editorial.svg';

  let currentAuthUser = null;
  let authCheckCompleted = false;

  /**
   * Attaches a fallback handler to an <img> element so failed network images
   * gracefully swap to a local SVG graphic without infinite loops.
   */
  function attachImageFallback(imgElement) {
    if (!imgElement || imgElement.dataset.fallbackBound === 'true') {
      return;
    }

    imgElement.dataset.fallbackBound = 'true';

    function handleImageError() {
      if (imgElement.dataset.fallbackApplied === 'true') {
        return;
      }
      imgElement.dataset.fallbackApplied = 'true';
      const fallbackType = imgElement.dataset.fallbackType || 'dish';
      imgElement.src =
        fallbackType === 'editorial' ? FALLBACK_EDITORIAL_IMAGE : FALLBACK_DISH_IMAGE;
    }

    imgElement.addEventListener('error', handleImageError);

    // Handle case where image already failed before script ran
    if (imgElement.complete && imgElement.naturalWidth === 0 && imgElement.getAttribute('src')) {
      handleImageError();
    }
  }

  /**
   * Scans a container (or document) and binds image fallbacks to all images.
   */
  function bindImageFallbacksIn(root) {
    const scope = root || document;
    const images = scope.querySelectorAll('img');
    images.forEach(attachImageFallback);
  }

  /**
   * Initializes mobile hamburger navigation with keyboard and outside-click support.
   */
  function initNavigation() {
    const header = document.querySelector('.site-header');
    const toggleBtn = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // Scroll elevation effect
    if (header) {
      const updateHeaderScroll = function () {
        if (window.scrollY > 16) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
      };
      updateHeaderScroll();
      window.addEventListener('scroll', updateHeaderScroll, { passive: true });
    }

    if (!toggleBtn || !navMenu) {
      return;
    }

    function setMenuOpen(isOpen) {
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.setAttribute(
        'aria-label',
        isOpen ? 'Close navigation menu' : 'Open navigation menu'
      );
      navMenu.classList.toggle('is-open', isOpen);
    }

    toggleBtn.addEventListener('click', function () {
      const isCurrentlyOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
      setMenuOpen(!isCurrentlyOpen);
    });

    // Close menu when a link inside it is clicked
    navMenu.addEventListener('click', function (event) {
      const clickedLink = event.target.closest('a');
      if (clickedLink) {
        setMenuOpen(false);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        toggleBtn.focus();
      }
    });

    // Close when clicking outside the header on mobile viewports
    document.addEventListener('click', function (event) {
      if (
        toggleBtn.getAttribute('aria-expanded') === 'true' &&
        header &&
        !header.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });
  }

  /**
   * Ensures the `.nav-auth` container exists in `.nav-menu` right before the Book a Table CTA.
   */
  function getOrCreateNavAuthSlot() {
    let slot = document.getElementById('nav-auth-slot');
    if (slot) {
      return slot;
    }

    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) {
      return null;
    }

    slot = document.createElement('div');
    slot.id = 'nav-auth-slot';
    slot.className = 'nav-auth';
    slot.setAttribute('aria-live', 'polite');

    const ctaBtn = navMenu.querySelector('.btn');
    if (ctaBtn) {
      navMenu.insertBefore(slot, ctaBtn);
    } else {
      navMenu.appendChild(slot);
    }

    return slot;
  }

  /**
   * Renders the navigation authentication controls based on the current session user.
   * Avoids flashing incorrect controls before initial session check finishes.
   */
  function renderAuthNavigationUI(user) {
    currentAuthUser = user || null;
    const slot = getOrCreateNavAuthSlot();
    if (!slot) {
      return;
    }

    slot.innerHTML = '';
    slot.setAttribute('data-auth-state', user ? 'authenticated' : 'logged-out');

    const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    if (user && user.id) {
      const firstName =
        globalScope.OliveEmberAuth &&
        typeof globalScope.OliveEmberAuth.getCustomerFirstName === 'function'
          ? globalScope.OliveEmberAuth.getCustomerFirstName(user)
          : 'Guest';

      const accountLink = document.createElement('a');
      accountLink.href = 'reservation.html#my-reservations';
      accountLink.className = 'nav-account-indicator';
      accountLink.setAttribute('data-auth-account', 'true');
      accountLink.title = 'View your reservation requests';

      const dot = document.createElement('span');
      dot.className = 'nav-account-indicator__dot';
      dot.setAttribute('aria-hidden', 'true');

      const nameSpan = document.createElement('span');
      nameSpan.textContent = firstName;

      accountLink.appendChild(dot);
      accountLink.appendChild(nameSpan);

      const logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.className = 'nav-logout-btn';
      logoutBtn.setAttribute('data-auth-logout', 'true');
      logoutBtn.textContent = 'Logout';

      logoutBtn.addEventListener('click', async function () {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Signing out…';
        try {
          if (globalScope.OliveEmberAuth) {
            await globalScope.OliveEmberAuth.signOut();
          }
        } finally {
          renderAuthNavigationUI(null);
          window.dispatchEvent(
            new CustomEvent('olive-ember:auth-change', { detail: { user: null } })
          );
          if (currentPage === 'reservation.html') {
            window.location.href = 'login.html?redirect=reservation.html';
          }
        }
      });

      slot.appendChild(accountLink);
      slot.appendChild(logoutBtn);
    } else {
      const loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.className =
        'nav-link nav-auth__link' + (currentPage === 'login.html' ? ' is-active' : '');
      if (currentPage === 'login.html') {
        loginLink.setAttribute('aria-current', 'page');
      }
      loginLink.setAttribute('data-auth-login', 'true');
      loginLink.textContent = 'Login';

      const signupLink = document.createElement('a');
      signupLink.href = 'signup.html';
      signupLink.className =
        'nav-link nav-auth__link' + (currentPage === 'signup.html' ? ' is-active' : '');
      if (currentPage === 'signup.html') {
        signupLink.setAttribute('aria-current', 'page');
      }
      signupLink.setAttribute('data-auth-signup', 'true');
      signupLink.textContent = 'Sign Up';

      slot.appendChild(loginLink);
      slot.appendChild(signupLink);
    }
  }

  /**
   * Protects all links that initiate the reservation flow (such as the navigation
   * "Book a Table" CTA, homepage "Reserve Your Table" CTA, and other links to
   * `reservation.html`). Unauthenticated visitors are redirected safely to
   * `login.html?redirect=reservation.html`.
   */
  function initProtectedReservationLinks() {
    document.addEventListener('click', function (event) {
      const anchor = event.target.closest('a[href]');
      if (!anchor) {
        return;
      }

      // Allow modified clicks (new tab) to be handled on the destination page as well
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const rawHref = (anchor.getAttribute('href') || '').trim();
      if (!rawHref) {
        return;
      }

      const baseTarget = rawHref.split('?')[0].split('#')[0].replace(/^\/+/, '');
      if (baseTarget !== 'reservation.html') {
        return;
      }

      // If authenticated, allow normal navigation to reservation.html
      if (currentAuthUser && currentAuthUser.id) {
        return;
      }

      // Redirect unauthenticated visitor to login.html with safe redirect target
      event.preventDefault();
      const safeTarget =
        globalScope.OliveEmberAuth &&
        typeof globalScope.OliveEmberAuth.getSafeRedirectPath === 'function'
          ? globalScope.OliveEmberAuth.getSafeRedirectPath(rawHref, 'reservation.html')
          : 'reservation.html';

      try {
        sessionStorage.setItem('oe_post_auth_redirect', safeTarget);
      } catch (_err) {
        // Ignore sessionStorage errors in restricted privacy modes
      }

      window.location.href = 'login.html?redirect=' + encodeURIComponent(safeTarget);
    });
  }

  /**
   * Initializes authentication state check and subscribes to live auth changes.
   */
  async function initAuthState() {
    const slot = getOrCreateNavAuthSlot();
    if (slot) {
      slot.setAttribute('data-auth-state', 'loading');
    }

    initProtectedReservationLinks();

    if (!globalScope.OliveEmberAuth) {
      authCheckCompleted = true;
      renderAuthNavigationUI(null);
      return;
    }

    // Listen for auth state changes across login/logout/token refresh
    globalScope.OliveEmberAuth.onAuthStateChange(function (_event, _session, user) {
      authCheckCompleted = true;
      renderAuthNavigationUI(user || null);
      window.dispatchEvent(
        new CustomEvent('olive-ember:auth-change', { detail: { user: user || null } })
      );
    });

    // Perform initial session check
    const { user } = await globalScope.OliveEmberAuth.getSession();
    authCheckCompleted = true;
    renderAuthNavigationUI(user || null);
    window.dispatchEvent(
      new CustomEvent('olive-ember:auth-change', { detail: { user: user || null } })
    );
  }

  /**
   * Populates the current year in footer copyright notices.
   */
  function initFooterYear() {
    const yearElements = document.querySelectorAll('[data-current-year]');
    const currentYear = String(new Date().getFullYear());
    yearElements.forEach(function (el) {
      el.textContent = currentYear;
    });
  }

  /**
   * Formats a numeric price in Indian Rupees (INR), e.g., ₹680 or ₹1,450.
   */
  function formatPriceINR(amount) {
    const numericPrice = Number(amount);
    if (!Number.isFinite(numericPrice)) {
      return '₹—';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(numericPrice);
  }

  /**
   * Initializes client-side validation for the Contact page demonstration form.
   */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) {
      return;
    }

    const statusBanner = document.getElementById('contact-form-status');
    const submitBtn = document.getElementById('contact-submit-btn');

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

    function validateContactFields() {
      let isValid = true;

      const nameVal = (document.getElementById('contact-name')?.value || '').trim();
      const emailVal = (document.getElementById('contact-email')?.value || '').trim();
      const subjectVal = (document.getElementById('contact-subject')?.value || '').trim();
      const messageVal = (document.getElementById('contact-message')?.value || '').trim();

      if (nameVal.length < 2) {
        setFieldError(
          'contact-name',
          'contact-name-error',
          'Please enter your full name (at least 2 characters).'
        );
        isValid = false;
      } else {
        setFieldError('contact-name', 'contact-name-error', '');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(emailVal)) {
        setFieldError('contact-email', 'contact-email-error', 'Please enter a valid email address.');
        isValid = false;
      } else {
        setFieldError('contact-email', 'contact-email-error', '');
      }

      if (!subjectVal) {
        setFieldError('contact-subject', 'contact-subject-error', 'Please select an inquiry topic.');
        isValid = false;
      } else {
        setFieldError('contact-subject', 'contact-subject-error', '');
      }

      if (messageVal.length < 10) {
        setFieldError(
          'contact-message',
          'contact-message-error',
          'Please enter a message of at least 10 characters.'
        );
        isValid = false;
      } else if (messageVal.length > 1000) {
        setFieldError(
          'contact-message',
          'contact-message-error',
          'Please keep your message under 1,000 characters.'
        );
        isValid = false;
      } else {
        setFieldError('contact-message', 'contact-message-error', '');
      }

      return isValid;
    }

    // Clear individual field errors as the user edits
    ['contact-name', 'contact-email', 'contact-subject', 'contact-message'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          setFieldError(id, id + '-error', '');
        });
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (statusBanner) {
        statusBanner.hidden = true;
        statusBanner.className = 'form-status';
        statusBanner.textContent = '';
      }

      // Check honeypot
      const honeypot = document.getElementById('contact-website');
      if (honeypot && honeypot.value.trim() !== '') {
        return;
      }

      if (!validateContactFields()) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      if (statusBanner) {
        statusBanner.className = 'form-status form-status--info';
        statusBanner.innerHTML =
          '<strong>Demo Validation Passed:</strong> Your inquiry passed client-side validation. Because this contact form is a frontend interface demonstration without an email relay backend, <strong>no message was sent</strong>. To test live database persistence, please use the <a href="reservation.html" class="text-link">Table Reservation form</a>.';
        statusBanner.hidden = false;
        statusBanner.focus();
      }

      form.reset();

      setTimeout(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }, 800);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initAuthState();
    initFooterYear();
    bindImageFallbacksIn(document);
    initContactForm();
  });

  globalScope.OliveEmberUI = {
    bindImageFallbacksIn: bindImageFallbacksIn,
    formatPriceINR: formatPriceINR,
    getCurrentAuthUser: function () {
      return currentAuthUser;
    },
    isAuthReady: function () {
      return authCheckCompleted;
    },
    refreshAuthUI: renderAuthNavigationUI
  };
})(window);

/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — GLOBAL UI & INTERACTIONS (js/main.js)
 * ============================================================================
 * Handles:
 *  - Accessible mobile navigation toggle & keyboard Escape handling
 *  - Sticky navigation elevation on scroll
 *  - Graceful image error fallbacks (no broken image icons)
 *  - Automatic footer copyright year
 *  - Contact page form client-side validation & transparent demo feedback
 * ============================================================================
 */

(function initOliveEmberMain(globalScope) {
  'use strict';

  const FALLBACK_DISH_IMAGE = 'assets/images/fallback-dish.svg';
  const FALLBACK_EDITORIAL_IMAGE = 'assets/images/fallback-editorial.svg';

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
    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenuOpen(false);
      });
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
        setFieldError('contact-name', 'contact-name-error', 'Please enter your full name (at least 2 characters).');
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
        setFieldError('contact-message', 'contact-message-error', 'Please enter a message of at least 10 characters.');
        isValid = false;
      } else if (messageVal.length > 1000) {
        setFieldError('contact-message', 'contact-message-error', 'Please keep your message under 1,000 characters.');
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
    initFooterYear();
    bindImageFallbacksIn(document);
    initContactForm();
  });

  globalScope.OliveEmberUI = {
    bindImageFallbacksIn: bindImageFallbacksIn,
    formatPriceINR: formatPriceINR
  };
})(window);

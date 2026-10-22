/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — TABLE RESERVATION CONTROLLER (js/reservation.js)
 * ============================================================================
 * Handles:
 *  - Configurable guest limits (1–12 guests) and date bounds (today onwards)
 *  - Client-side validation (name, email, Indian/international phone, date,
 *    time slot, guest count, special requests length)
 *  - Anti-spam protection (honeypot field + submission cooldown + button lock)
 *  - Live insert into Supabase `reservations` table
 *  - Shows success ONLY when Supabase confirms insert; preserves all user
 *    inputs if validation or database submission fails
 * ============================================================================
 */

(function initOliveEmberReservation() {
  'use strict';

  const RESERVATION_CONFIG = {
    minGuests: 1,
    maxGuests: 12,
    maxSpecialRequestsLength: 500,
    submissionCooldownMs: 12000
  };

  let isSubmitting = false;
  let lastSuccessfulSubmitTime = 0;

  /**
   * Returns today's local date formatted as YYYY-MM-DD.
   */
  function getTodayLocalISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  /**
   * Returns a date N months from today formatted as YYYY-MM-DD.
   */
  function getMaxFutureDateISO(monthsAhead) {
    const future = new Date();
    future.setMonth(future.getMonth() + monthsAhead);
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  /**
   * Validates phone numbers sensibly for India (+91 / 10-digit mobile/landline)
   * while allowing clean formatting spaces or hyphens.
   */
  function isValidPhoneForMarket(rawPhone) {
    const cleaned = rawPhone.replace(/[\s\-()]/g, '');
    // Indian mobile with optional +91 or 0 prefix, or standard 10-15 digit phone
    const indianPhoneRegex = /^(?:(?:\+|00)?91|0)?[6-9]\d{9}$/;
    const generalPhoneRegex = /^\+?[1-9]\d{9,14}$/;
    return indianPhoneRegex.test(cleaned) || generalPhoneRegex.test(cleaned);
  }

  /**
   * Sets or clears an accessible validation error on a form field.
   */
  function setFieldValidationError(inputId, errorId, errorMessage) {
    const inputEl = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);

    if (inputEl) {
      if (errorMessage) {
        inputEl.setAttribute('aria-invalid', 'true');
      } else {
        inputEl.removeAttribute('aria-invalid');
      }
    }

    if (errorEl) {
      errorEl.textContent = errorMessage || '';
    }
  }

  /**
   * Validates all reservation form inputs and returns `{ isValid, payload }`.
   */
  function validateReservationForm() {
    let isValid = true;

    const fullName = (document.getElementById('res-full-name')?.value || '').trim();
    const email = (document.getElementById('res-email')?.value || '').trim();
    const phone = (document.getElementById('res-phone')?.value || '').trim();
    const reservationDate = (document.getElementById('res-date')?.value || '').trim();
    const reservationTime = (document.getElementById('res-time')?.value || '').trim();
    const guestsRaw = (document.getElementById('res-guests')?.value || '').trim();
    const specialRequests = (document.getElementById('res-requests')?.value || '').trim();

    // 1. Full Name
    if (!fullName) {
      setFieldValidationError(
        'res-full-name',
        'res-full-name-error',
        'Please enter your full name.'
      );
      isValid = false;
    } else if (fullName.length < 2 || fullName.length > 120) {
      setFieldValidationError(
        'res-full-name',
        'res-full-name-error',
        'Full name must be between 2 and 120 characters.'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-full-name', 'res-full-name-error', '');
    }

    // 2. Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email) {
      setFieldValidationError('res-email', 'res-email-error', 'Please enter your email address.');
      isValid = false;
    } else if (!emailRegex.test(email) || email.length > 254) {
      setFieldValidationError(
        'res-email',
        'res-email-error',
        'Please enter a valid email address (for example, name@example.com).'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-email', 'res-email-error', '');
    }

    // 3. Phone Number
    if (!phone) {
      setFieldValidationError(
        'res-phone',
        'res-phone-error',
        'Please enter a contact phone number.'
      );
      isValid = false;
    } else if (!isValidPhoneForMarket(phone)) {
      setFieldValidationError(
        'res-phone',
        'res-phone-error',
        'Please enter a valid 10-digit Indian mobile number (e.g., +91 98765 43210).'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-phone', 'res-phone-error', '');
    }

    // 4. Reservation Date (must not be in the past)
    const todayISO = getTodayLocalISO();
    if (!reservationDate) {
      setFieldValidationError(
        'res-date',
        'res-date-error',
        'Please select a reservation date.'
      );
      isValid = false;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate) || reservationDate < todayISO) {
      setFieldValidationError(
        'res-date',
        'res-date-error',
        'Reservation date cannot be in the past. Please choose today or a future date.'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-date', 'res-date-error', '');
    }

    // 5. Preferred Time
    if (!reservationTime) {
      setFieldValidationError(
        'res-time',
        'res-time-error',
        'Please select your preferred dining time.'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-time', 'res-time-error', '');
    }

    // 6. Number of Guests (configurable limit, initially 1–12)
    const guestsNum = Number(guestsRaw);
    if (!guestsRaw || !Number.isInteger(guestsNum)) {
      setFieldValidationError(
        'res-guests',
        'res-guests-error',
        'Please enter a whole number of guests.'
      );
      isValid = false;
    } else if (
      guestsNum < RESERVATION_CONFIG.minGuests ||
      guestsNum > RESERVATION_CONFIG.maxGuests
    ) {
      setFieldValidationError(
        'res-guests',
        'res-guests-error',
        'Guest count must be between ' +
          RESERVATION_CONFIG.minGuests +
          ' and ' +
          RESERVATION_CONFIG.maxGuests +
          '. For larger gatherings, please contact us directly.'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-guests', 'res-guests-error', '');
    }

    // 7. Special Requests (optional, max 500 characters)
    if (specialRequests.length > RESERVATION_CONFIG.maxSpecialRequestsLength) {
      setFieldValidationError(
        'res-requests',
        'res-requests-error',
        'Special requests must be ' +
          RESERVATION_CONFIG.maxSpecialRequestsLength +
          ' characters or fewer.'
      );
      isValid = false;
    } else {
      setFieldValidationError('res-requests', 'res-requests-error', '');
    }

    return {
      isValid: isValid,
      payload: {
        full_name: fullName,
        email: email,
        phone: phone,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        guests: guestsNum,
        special_requests: specialRequests || null
      }
    };
  }

  /**
   * Renders an accessible status banner above the form.
   */
  function showFormStatus(type, titleText, bodyText) {
    const statusEl = document.getElementById('reservation-status');
    if (!statusEl) {
      return;
    }

    statusEl.className = 'form-status form-status--' + type;
    statusEl.innerHTML = '';

    const strong = document.createElement('strong');
    strong.textContent = titleText + ' ';

    const span = document.createElement('span');
    span.textContent = bodyText;

    statusEl.appendChild(strong);
    statusEl.appendChild(span);
    statusEl.hidden = false;
    statusEl.focus();
  }

  /**
   * Initializes date input constraints, connection indicator, and form submission.
   */
  function initReservationPage() {
    const form = document.getElementById('reservation-form');
    if (!form) {
      return;
    }

    const dateInput = document.getElementById('res-date');
    if (dateInput) {
      const todayISO = getTodayLocalISO();
      dateInput.setAttribute('min', todayISO);
      dateInput.setAttribute('max', getMaxFutureDateISO(6));
      if (!dateInput.value) {
        dateInput.value = todayISO;
      }
    }

    // Show database connection readiness indicator
    const dbIndicator = document.getElementById('reservation-db-indicator');
    if (dbIndicator) {
      if (window.OliveEmberDB && window.OliveEmberDB.isConfigured) {
        dbIndicator.className = 'data-source-banner data-source-banner--live';
        dbIndicator.innerHTML =
          '<span><strong>Supabase Connected:</strong> Reservation requests on this page will be saved directly to the <code>reservations</code> table with status <code>pending</code>.</span>';
      } else {
        dbIndicator.className = 'data-source-banner';
        dbIndicator.innerHTML =
          '<span><strong>Database Setup Required for Live Submission:</strong> Supabase credentials are currently set to placeholders. Form validation works immediately, and once you add your Supabase URL and Publishable Key (see <code>README.md</code>), submissions will be stored in PostgreSQL.</span>';
      }
      dbIndicator.hidden = false;
    }

    // Clear individual field errors when user modifies a field
    const fieldIds = [
      'res-full-name',
      'res-email',
      'res-phone',
      'res-date',
      'res-time',
      'res-guests',
      'res-requests'
    ];

    fieldIds.forEach(function (id) {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', function () {
          setFieldValidationError(id, id + '-error', '');
        });
        input.addEventListener('change', function () {
          setFieldValidationError(id, id + '-error', '');
        });
      }
    });

    const submitBtn = document.getElementById('res-submit-btn');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      // Honeypot check against automated spam bots
      const honeypot = document.getElementById('res-company-website');
      if (honeypot && honeypot.value.trim() !== '') {
        return;
      }

      // Prevent rapid accidental double-submissions
      const now = Date.now();
      if (
        lastSuccessfulSubmitTime > 0 &&
        now - lastSuccessfulSubmitTime < RESERVATION_CONFIG.submissionCooldownMs
      ) {
        showFormStatus(
          'info',
          'Request Recently Received:',
          'Your reservation request was just submitted. Please wait a few seconds before submitting another request.'
        );
        return;
      }

      const statusEl = document.getElementById('reservation-status');
      if (statusEl) {
        statusEl.hidden = true;
      }

      // Step 1: Validate the form in JavaScript
      const validation = validateReservationForm();
      if (!validation.isValid) {
        showFormStatus(
          'error',
          'Please check your details:',
          'One or more fields require attention before we can submit your reservation request.'
        );
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      // Lock submit button while request is processing
      isSubmitting = true;
      const originalBtnText = submitBtn ? submitBtn.textContent : 'Request a Table';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Request…';
      }

      try {
        // Step 2: Send the reservation to Supabase
        if (!window.OliveEmberDB) {
          throw new Error('Supabase integration module (js/supabase.js) is unavailable.');
        }

        const result = await window.OliveEmberDB.submitReservation(validation.payload);

        // Step 5 & 6: If the request fails, show a clear error and preserve user entries
        if (!result.success) {
          const errMsg =
            result.error && result.error.message
              ? result.error.message
              : 'Unable to record your reservation request at this time.';
          showFormStatus(
            'error',
            'Reservation Request Not Saved:',
            errMsg + ' Your entered details have been preserved so you do not have to retype them.'
          );
          return;
        }

        // Step 3 & 4: Show success ONLY after database confirms insert, then reset form
        lastSuccessfulSubmitTime = Date.now();
        showFormStatus(
          'success',
          'Reservation Request Received (Pending Confirmation):',
          'Thank you, ' +
            validation.payload.full_name +
            '. Your request for ' +
            validation.payload.guests +
            ' ' +
            (validation.payload.guests === 1 ? 'guest' : 'guests') +
            ' on ' +
            validation.payload.reservation_date +
            ' at ' +
            validation.payload.reservation_time +
            ' has been saved with status "pending". Please note that your table is not guaranteed until our host team confirms availability via phone or email.'
        );

        form.reset();
        if (dateInput) {
          dateInput.value = getTodayLocalISO();
        }
      } catch (unexpectedErr) {
        showFormStatus(
          'error',
          'Unexpected Submission Error:',
          (unexpectedErr.message || 'A network error occurred.') +
            ' Your form entries have been preserved.'
        );
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initReservationPage);
})();

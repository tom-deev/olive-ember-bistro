/**
 * ============================================================================
 * OLIVE & EMBER BISTRO — INTERACTIVE MENU CONTROLLER (js/menu.js)
 * ============================================================================
 * Handles:
 *  - Loading menu items from Supabase (`menu_items` table) when configured
 *  - Honest fallback to local demonstration menu data when Supabase is not yet
 *    configured or unreachable
 *  - Category filtering (All, Starters, Main Course, Pasta, Desserts, Beverages)
 *  - Live keyword search and vegetarian-only filtering
 *  - Accessible loading, empty, and fallback status banners
 * ============================================================================
 */

(function initOliveEmberMenu() {
  'use strict';

  /**
   * Local fictional demonstration menu items (mirrors `supabase/schema.sql`).
   * Used when Supabase is not yet configured or if the database query fails.
   */
  const LOCAL_SAMPLE_MENU = [
    // STARTERS
    {
      id: 'local-starter-1',
      name: 'Charred Heirloom Burrata & Fig',
      description:
        'Artisanal creamy burrata paired with wood-roasted Black Mission figs, aged Modena balsamic reduction, toasted pine nuts, and cold-pressed olive oil on grilled sourdough.',
      category: 'Starters',
      price: 680,
      image_url:
        'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-starter-2',
      name: 'Wood-Fired Garlic Prawns',
      description:
        'Wild-caught coastal tiger prawns seared in cast iron with smoked paprika, confit garlic cloves, charred lemon, and fresh flat-leaf parsley.',
      category: 'Starters',
      price: 840,
      image_url:
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: false,
      is_available: true
    },
    {
      id: 'local-starter-3',
      name: 'Ember-Roasted Beet & Whipped Ricotta',
      description:
        'Slow-roasted ruby and golden beets over house-whipped lemon ricotta, crushed pistachios, orange segments, and wildflower honey drizzle.',
      category: 'Starters',
      price: 560,
      image_url:
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-starter-4',
      name: 'Crispy Artichoke & Truffle Aioli',
      description:
        'Flash-crisped baby Roman artichokes finished with flaky sea salt, shaved Parmigiano-Reggiano, and black truffle garlic emulsion.',
      category: 'Starters',
      price: 620,
      image_url:
        'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },

    // MAIN COURSE
    {
      id: 'local-main-1',
      name: 'Herb-Crusted Sea Bass',
      description:
        'Pan-seared wild sea bass fillet over saffron-infused fennel broth, charred baby leeks, blistered cherry tomatoes, and Kalamata olive tapenade.',
      category: 'Main Course',
      price: 1450,
      image_url:
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: false,
      is_available: true
    },
    {
      id: 'local-main-2',
      name: 'Smoked Rosemary Lamb Chops',
      description:
        'Pasture-raised tender lamb cutlets grilled over white oak embers, served with roasted parsnip purée, charred broccolini, and pomegranate jus.',
      category: 'Main Course',
      price: 1680,
      image_url:
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: false,
      is_available: true
    },
    {
      id: 'local-main-3',
      name: 'Charred Cauliflower & Harissa Steak',
      description:
        'Thick-cut cauliflower crown basted in house rose harissa butter, resting on beluga lentil ragout, tahini yoghurt, toasted almonds, and crisp sage.',
      category: 'Main Course',
      price: 920,
      image_url:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-main-4',
      name: 'Slow-Braised Duck Confit',
      description:
        'Crisp-skinned duck leg slow-cooked with thyme and bay leaf, accompanied by creamy polenta, roasted wild mushrooms, and spiced sour cherry glaze.',
      category: 'Main Course',
      price: 1520,
      image_url:
        'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: false,
      is_available: true
    },

    // PASTA
    {
      id: 'local-pasta-1',
      name: 'Black Truffle & Wild Mushroom Tagliatelle',
      description:
        'Hand-rolled egg ribbon pasta tossed with foraged porcini and cremini mushrooms, 24-month aged Parmigiano butter, thyme, and shaved black truffle.',
      category: 'Pasta',
      price: 980,
      image_url:
        'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-pasta-2',
      name: 'Saffron & Crab Linguine',
      description:
        'Artisanal bronze-die linguine simmered in a light Kashmiri saffron and white wine bisque with sweet blue crab meat, chilli flakes, and lemon zest.',
      category: 'Pasta',
      price: 1180,
      image_url:
        'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: false,
      is_available: true
    },
    {
      id: 'local-pasta-3',
      name: 'Roasted Butternut & Sage Ravioli',
      description:
        'Delicate handmade pasta pillows filled with caramelized butternut squash and nutmeg, finished in brown butter with crispy sage leaves and amaretti crumbs.',
      category: 'Pasta',
      price: 860,
      image_url:
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },

    // DESSERTS
    {
      id: 'local-dessert-1',
      name: 'Burnt Honey & Olive Oil Basque Cheesecake',
      description:
        'Velvety caramelized crustless cheesecake infused with single-estate extra virgin olive oil and wild forest honey, served with macerated berries.',
      category: 'Desserts',
      price: 540,
      image_url:
        'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-dessert-2',
      name: 'Dark Chocolate & Espresso Tart',
      description:
        '70% single-origin dark chocolate ganache in a toasted hazelnut pastry shell, topped with Maldon sea salt flakes and cardamom crème fraîche.',
      category: 'Desserts',
      price: 580,
      image_url:
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-dessert-3',
      name: 'Poached Pear in Spiced Mulled Jus',
      description:
        'Bartlett pear gently poached with star anise, cinnamon, and orange peel, served warm alongside artisanal vanilla bean gelato and pistachio praline.',
      category: 'Desserts',
      price: 490,
      image_url:
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },

    // BEVERAGES
    {
      id: 'local-bev-1',
      name: 'Smoked Rosemary & Blood Orange Spritz',
      description:
        'House-crafted zero-proof botanical aperitif with freshly pressed blood orange, charred rosemary syrup, artisanal tonic, and dehydrated citrus wheel.',
      category: 'Beverages',
      price: 390,
      image_url:
        'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-bev-2',
      name: 'Cold-Brewed Hibiscus & Fig Iced Tea',
      description:
        'Slow-steeped organic hibiscus petals blended with fig nectar, crushed mint, and a hint of ginger over crystal ice.',
      category: 'Beverages',
      price: 340,
      image_url:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    },
    {
      id: 'local-bev-3',
      name: 'Single-Estate Coorg Pour-Over Coffee',
      description:
        'Medium-dark roast Arabica beans from Coorg highlands, hand-brewed to order with tasting notes of toasted cacao, plum, and warm spice.',
      category: 'Beverages',
      price: 310,
      image_url:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
      is_vegetarian: true,
      is_available: true
    }
  ];

  const state = {
    items: [],
    activeCategory: 'All',
    searchQuery: '',
    vegetarianOnly: false
  };

  /**
   * Builds a single menu card DOM node safely without raw HTML injection.
   */
  function createMenuCardElement(item) {
    const article = document.createElement('article');
    article.className = 'dish-card';
    article.setAttribute('data-category', item.category || '');
    article.setAttribute('data-id', String(item.id || ''));

    // Media wrapper
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'dish-card__media';

    const img = document.createElement('img');
    img.src = item.image_url || 'assets/images/fallback-dish.svg';
    img.alt = item.name ? item.name + ' — Olive & Ember Bistro' : 'Menu dish photograph';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.fallbackType = 'dish';
    mediaWrap.appendChild(img);

    // Badges overlay
    const badgesWrap = document.createElement('div');
    badgesWrap.className = 'dish-card__badges';

    const catBadge = document.createElement('span');
    catBadge.className = 'badge badge--category';
    catBadge.textContent = item.category || 'Seasonal';
    badgesWrap.appendChild(catBadge);

    const dietBadge = document.createElement('span');
    if (item.is_vegetarian) {
      dietBadge.className = 'badge badge--veg';
      const dot = document.createElement('span');
      dot.className = 'veg-dot';
      dot.setAttribute('aria-hidden', 'true');
      dietBadge.appendChild(dot);
      dietBadge.appendChild(document.createTextNode('Vegetarian'));
    } else {
      dietBadge.className = 'badge badge--nonveg';
      const dot = document.createElement('span');
      dot.className = 'veg-dot';
      dot.setAttribute('aria-hidden', 'true');
      dietBadge.appendChild(dot);
      dietBadge.appendChild(document.createTextNode('Contains Meat/Seafood'));
    }
    badgesWrap.appendChild(dietBadge);

    if (item.is_available === false) {
      const unavailBadge = document.createElement('span');
      unavailBadge.className = 'badge badge--unavailable';
      unavailBadge.textContent = 'Currently Unavailable';
      badgesWrap.appendChild(unavailBadge);
    }

    mediaWrap.appendChild(badgesWrap);
    article.appendChild(mediaWrap);

    // Card body
    const body = document.createElement('div');
    body.className = 'dish-card__body';

    const header = document.createElement('div');
    header.className = 'dish-card__header';

    const title = document.createElement('h3');
    title.className = 'dish-card__title';
    title.textContent = item.name || 'Seasonal Dish';

    const price = document.createElement('span');
    price.className = 'dish-card__price';
    price.textContent = window.OliveEmberUI
      ? window.OliveEmberUI.formatPriceINR(item.price)
      : '₹' + Number(item.price || 0).toLocaleString('en-IN');

    header.appendChild(title);
    header.appendChild(price);
    body.appendChild(header);

    const desc = document.createElement('p');
    desc.className = 'dish-card__desc';
    desc.textContent = item.description || '';
    body.appendChild(desc);

    const footer = document.createElement('div');
    footer.className = 'dish-card__footer';

    const availabilityText = document.createElement('span');
    availabilityText.textContent =
      item.is_available === false ? 'Sold out for tonight' : 'Available for Lunch & Dinner';

    const sampleNote = document.createElement('span');
    sampleNote.textContent = 'Sample Price (INR)';

    footer.appendChild(availabilityText);
    footer.appendChild(sampleNote);
    body.appendChild(footer);

    article.appendChild(body);

    if (window.OliveEmberUI && typeof window.OliveEmberUI.bindImageFallbacksIn === 'function') {
      window.OliveEmberUI.bindImageFallbacksIn(article);
    }

    return article;
  }

  /**
   * Filters `state.items` according to active category, search query, and vegetarian toggle.
   */
  function getFilteredItems() {
    const query = state.searchQuery.trim().toLowerCase();

    return state.items.filter(function (item) {
      if (item.is_available === false) {
        return false;
      }

      if (state.activeCategory !== 'All' && item.category !== state.activeCategory) {
        return false;
      }

      if (state.vegetarianOnly && !item.is_vegetarian) {
        return false;
      }

      if (query) {
        const haystack = (
          (item.name || '') +
          ' ' +
          (item.description || '') +
          ' ' +
          (item.category || '')
        ).toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Renders the filtered menu items or an empty state with a reset button.
   */
  function renderMenuGrid() {
    const gridEl = document.getElementById('menu-grid');
    const countEl = document.getElementById('menu-results-count');
    if (!gridEl) {
      return;
    }

    gridEl.innerHTML = '';
    const filtered = getFilteredItems();

    if (countEl) {
      countEl.textContent =
        'Showing ' +
        filtered.length +
        ' ' +
        (filtered.length === 1 ? 'dish' : 'dishes') +
        (state.activeCategory !== 'All' ? ' in ' + state.activeCategory : '');
    }

    if (filtered.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'state-box';

      const heading = document.createElement('h3');
      heading.className = 'state-box__title';
      heading.textContent = 'No dishes match your current filter';

      const text = document.createElement('p');
      text.className = 'state-box__text';
      text.textContent =
        'Try selecting another category, clearing your search term, or disabling the vegetarian-only filter.';

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn--outline btn--sm';
      resetBtn.textContent = 'Reset All Filters';
      resetBtn.addEventListener('click', resetAllFilters);

      emptyBox.appendChild(heading);
      emptyBox.appendChild(text);
      emptyBox.appendChild(resetBtn);
      gridEl.appendChild(emptyBox);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(function (item) {
      fragment.appendChild(createMenuCardElement(item));
    });
    gridEl.appendChild(fragment);
  }

  /**
   * Resets category, search input, and vegetarian toggle to defaults.
   */
  function resetAllFilters() {
    state.activeCategory = 'All';
    state.searchQuery = '';
    state.vegetarianOnly = false;

    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
      searchInput.value = '';
    }

    const vegCheckbox = document.getElementById('menu-veg-only');
    if (vegCheckbox) {
      vegCheckbox.checked = false;
    }

    const filterButtons = document.querySelectorAll('[data-category-filter]');
    filterButtons.forEach(function (btn) {
      const isAll = btn.getAttribute('data-category-filter') === 'All';
      btn.classList.toggle('is-active', isAll);
      btn.setAttribute('aria-pressed', String(isAll));
    });

    renderMenuGrid();
  }

  /**
   * Updates the discreet data-source banner so visitors/developers know whether
   * items were loaded from Supabase PostgreSQL or the local sample dataset.
   */
  function updateDataSourceBanner(mode, detailMessage) {
    const banner = document.getElementById('menu-data-source-banner');
    if (!banner) {
      return;
    }

    banner.hidden = false;
    if (mode === 'supabase') {
      banner.className = 'data-source-banner data-source-banner--live';
      banner.innerHTML =
        '<span><strong>Live Database Connected:</strong> Menu items loaded from Supabase PostgreSQL (<code>menu_items</code>). All prices are fictional INR demonstration values.</span>';
    } else if (mode === 'error') {
      banner.className = 'data-source-banner';
      banner.innerHTML = '';
      const span = document.createElement('span');
      span.innerHTML =
        '<strong>Local Demo Catalog Active:</strong> Could not load menu from Supabase ';
      const reasonText = document.createElement('span');
      reasonText.textContent = detailMessage ? '(' + detailMessage + '). ' : '. ';
      span.appendChild(reasonText);
      span.appendChild(
        document.createTextNode(
          'Displaying built-in fictional sample menu items instead.'
        )
      );
      banner.appendChild(span);
    } else {
      banner.className = 'data-source-banner';
      banner.innerHTML =
        '<span><strong>Demonstration Mode:</strong> Displaying built-in fictional sample menu items (all prices in INR are for demonstration). Configure Supabase in <code>js/supabase.js</code> or <code>js/config.local.js</code> to load from PostgreSQL.</span>';
    }
  }

  /**
   * Loads menu data from Supabase if configured, falling back gracefully to local sample data.
   */
  async function loadMenuData() {
    const gridEl = document.getElementById('menu-grid');
    if (!gridEl) {
      return;
    }

    // Show accessible loading state
    gridEl.innerHTML =
      '<div class="state-box" role="status"><h3 class="state-box__title">Preparing the Menu…</h3><p class="state-box__text">Checking seasonal dishes and kitchen availability.</p></div>';

    if (window.OliveEmberDB && window.OliveEmberDB.isConfigured) {
      const result = await window.OliveEmberDB.fetchMenuItems();
      if (!result.error && Array.isArray(result.data) && result.data.length > 0) {
        state.items = result.data;
        updateDataSourceBanner('supabase');
        renderMenuGrid();
        return;
      }

      const errReason = result.error
        ? result.error.message || 'Database query failed'
        : 'No available rows found in menu_items table';
      state.items = LOCAL_SAMPLE_MENU;
      updateDataSourceBanner('error', errReason);
      renderMenuGrid();
      return;
    }

    // Supabase not configured -> use local sample menu transparently
    state.items = LOCAL_SAMPLE_MENU;
    updateDataSourceBanner('local');
    renderMenuGrid();
  }

  /**
   * Binds category filter buttons, search input, and vegetarian filter controls.
   */
  function bindFilterControls() {
    const filterButtons = document.querySelectorAll('[data-category-filter]');
    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const selectedCategory = button.getAttribute('data-category-filter') || 'All';
        state.activeCategory = selectedCategory;

        filterButtons.forEach(function (btn) {
          const isMatch = btn.getAttribute('data-category-filter') === selectedCategory;
          btn.classList.toggle('is-active', isMatch);
          btn.setAttribute('aria-pressed', String(isMatch));
        });

        renderMenuGrid();
      });
    });

    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (event) {
        state.searchQuery = event.target.value || '';
        renderMenuGrid();
      });
    }

    const vegCheckbox = document.getElementById('menu-veg-only');
    if (vegCheckbox) {
      vegCheckbox.addEventListener('change', function (event) {
        state.vegetarianOnly = Boolean(event.target.checked);
        renderMenuGrid();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('menu-grid')) {
      return;
    }
    bindFilterControls();
    loadMenuData();
  });
})();

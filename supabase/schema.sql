-- ============================================================================
-- OLIVE & EMBER BISTRO — SUPABASE POSTGRESQL SCHEMA & SEED DATA
-- ============================================================================
-- How to run:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste the entire contents of this file and click "Run".
-- ============================================================================

-- Enable pgcrypto extension for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLE: menu_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
    description TEXT CHECK (description IS NULL OR char_length(description) <= 600),
    category TEXT NOT NULL CHECK (category IN ('Starters', 'Main Course', 'Pasta', 'Desserts', 'Beverages')),
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0 AND price <= 50000),
    image_url TEXT,
    is_vegetarian BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.menu_items IS 'Fictional demonstration menu items for Olive & Ember Bistro.';

CREATE INDEX IF NOT EXISTS idx_menu_items_category_available
    ON public.menu_items (category, is_available);

CREATE INDEX IF NOT EXISTS idx_menu_items_created_at
    ON public.menu_items (created_at ASC);

-- ============================================================================
-- 2. TABLE: reservations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
    email TEXT NOT NULL CHECK (
        char_length(trim(email)) BETWEEN 5 AND 254
        AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    phone TEXT NOT NULL CHECK (
        char_length(trim(phone)) BETWEEN 10 AND 20
        AND phone ~ '^[0-9+\-\s()]{10,20}$'
    ),
    reservation_date DATE NOT NULL CHECK (reservation_date >= CURRENT_DATE),
    reservation_time TEXT NOT NULL CHECK (char_length(trim(reservation_time)) BETWEEN 4 AND 20),
    guests INTEGER NOT NULL CHECK (guests >= 1 AND guests <= 12),
    special_requests TEXT CHECK (special_requests IS NULL OR char_length(special_requests) <= 500),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reservations IS 'Table reservation requests submitted from the Olive & Ember Bistro website.';

CREATE INDEX IF NOT EXISTS idx_reservations_date_status
    ON public.reservations (reservation_date, status);

CREATE INDEX IF NOT EXISTS idx_reservations_created_at
    ON public.reservations (created_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running the script so it stays idempotent
DROP POLICY IF EXISTS "Public visitors can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public visitors can submit pending reservation requests" ON public.reservations;

-- Policy A: Anyone can read available menu items
CREATE POLICY "Public visitors can view available menu items"
    ON public.menu_items
    FOR SELECT
    TO anon, authenticated
    USING (is_available = true);

-- Policy B: Public visitors can ONLY insert new reservation requests that meet
-- strict validation criteria. They CANNOT read, update, or delete reservations.
CREATE POLICY "Public visitors can submit pending reservation requests"
    ON public.reservations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        status = 'pending'
        AND guests BETWEEN 1 AND 12
        AND reservation_date >= CURRENT_DATE
        AND char_length(trim(full_name)) BETWEEN 2 AND 120
        AND char_length(trim(email)) BETWEEN 5 AND 254
        AND char_length(trim(phone)) BETWEEN 10 AND 20
        AND (special_requests IS NULL OR char_length(special_requests) <= 500)
    );

-- Explicitly ensure privileges align with RLS policies for anon/authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT ON public.reservations TO anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.reservations FROM anon;

-- ============================================================================
-- 4. SEED DATA FOR menu_items (Fictional Demonstration Menu — Prices in INR)
-- ============================================================================
-- Only insert seed rows if the table is currently empty
INSERT INTO public.menu_items (name, description, category, price, image_url, is_vegetarian, is_available)
SELECT
    seed.name,
    seed.description,
    seed.category,
    seed.price,
    seed.image_url,
    seed.is_vegetarian,
    seed.is_available
FROM (
    VALUES
    -- STARTERS
    (
        'Charred Heirloom Burrata & Fig',
        'Artisanal creamy burrata paired with wood-roasted Black Mission figs, aged Modena balsamic reduction, toasted pine nuts, and cold-pressed olive oil on grilled sourdough.',
        'Starters',
        680.00,
        'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Wood-Fired Garlic Prawns',
        'Wild-caught coastal tiger prawns seared in cast iron with smoked paprika, confit garlic cloves, charred lemon, and fresh flat-leaf parsley.',
        'Starters',
        840.00,
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80',
        false,
        true
    ),
    (
        'Ember-Roasted Beet & Whipped Ricotta',
        'Slow-roasted ruby and golden beets over house-whipped lemon ricotta, crushed pistachios, orange segments, and wildflower honey drizzle.',
        'Starters',
        560.00,
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Crispy Artichoke & Truffle Aioli',
        'Flash-crisped baby Roman artichokes finished with flaky sea salt, shaved Parmigiano-Reggiano, and black truffle garlic emulsion.',
        'Starters',
        620.00,
        'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),

    -- MAIN COURSE
    (
        'Herb-Crusted Sea Bass',
        'Pan-seared wild sea bass fillet over saffron-infused fennel broth, charred baby leeks, blistered cherry tomatoes, and Kalamata olive tapenade.',
        'Main Course',
        1450.00,
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
        false,
        true
    ),
    (
        'Smoked Rosemary Lamb Chops',
        ' Pasture-raised tender lamb cutlets grilled over white oak embers, served with roasted parsnip purée, charred broccolini, and pomegranate jus.',
        'Main Course',
        1680.00,
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
        false,
        true
    ),
    (
        'Charred Cauliflower & Harissa Steak',
        'Thick-cut cauliflower crown basted in house rose harissa butter, resting on beluga lentil ragout, tahini yoghurt, toasted almonds, and crisp sage.',
        'Main Course',
        920.00,
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Slow-Braised Duck Confit',
        'Crisp-skinned duck leg slow-cooked with thyme and bay leaf, accompanied by creamy polenta, roasted wild mushrooms, and spiced sour cherry glaze.',
        'Main Course',
        1520.00,
        'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&q=80',
        false,
        true
    ),

    -- PASTA
    (
        'Black Truffle & Wild Mushroom Tagliatelle',
        'Hand-rolled egg ribbon pasta tossed with foraged porcini and cremini mushrooms, 24-month aged Parmigiano butter, thyme, and shaved black truffle.',
        'Pasta',
        980.00,
        'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Saffron & Crab Linguine',
        'Artisanal bronze-die linguine simmered in a light Kashmiri saffron and white wine bisque with sweet blue crab meat, chilli flakes, and lemon zest.',
        'Pasta',
        1180.00,
        'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=900&q=80',
        false,
        true
    ),
    (
        'Roasted Butternut & Sage Ravioli',
        'Delicate handmade pasta pillows filled with caramelized butternut squash and nutmeg, finished in brown butter with crispy sage leaves and amaretti crumbs.',
        'Pasta',
        860.00,
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),

    -- DESSERTS
    (
        'Burnt Honey & Olive Oil Basque Cheesecake',
        'Velvety caramelized crustless cheesecake infused with single-estate extra virgin olive oil and wild forest honey, served with macerated berries.',
        'Desserts',
        540.00,
        'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Dark Chocolate & Espresso Tart',
        '70% single-origin dark chocolate ganache in a toasted hazelnut pastry shell, topped with Maldon sea salt flakes and cardamom crème fraîche.',
        'Desserts',
        580.00,
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Poached Pear in Spiced Mulled Jus',
        'Bartlett pear gently poached with star anise, cinnamon, and orange peel, served warm alongside artisanal vanilla bean gelato and pistachio praline.',
        'Desserts',
        490.00,
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),

    -- BEVERAGES
    (
        'Smoked Rosemary & Blood Orange Spritz',
        'House-crafted zero-proof botanical aperitif with freshly pressed blood orange, charred rosemary syrup, artisanal tonic, and dehydrated citrus wheel.',
        'Beverages',
        390.00,
        'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Cold-Brewed Hibiscus & Fig Iced Tea',
        'Slow-steeped organic hibiscus petals blended with fig nectar, crushed mint, and a hint of ginger over crystal ice.',
        'Beverages',
        340.00,
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80',
        true,
        true
    ),
    (
        'Single-Estate Coorg Pour-Over Coffee',
        'Medium-dark roast Arabica beans from Coorg highlands, hand-brewed to order with tasting notes of toasted cacao, plum, and warm spice.',
        'Beverages',
        310.00,
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
        true,
        true
    )
) AS seed(name, description, category, price, image_url, is_vegetarian, is_available)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items LIMIT 1);

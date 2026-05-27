CREATE TABLE favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  calories integer DEFAULT 0,
  carbs_g real DEFAULT 0,
  protein_g real DEFAULT 0,
  fats_g real DEFAULT 0,
  items jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX favorites_user_idx ON favorites(user_id);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON favorites FOR ALL USING (true) WITH CHECK (true);

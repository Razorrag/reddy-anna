-- Add configurable bonus settings with default values
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('default_deposit_bonus_percent', '5', 'Deposit bonus percentage (5% = 5, 30% = 30)'),
('referral_bonus_percent', '1', 'Referral bonus percentage (1% = 1)'),
('conditional_bonus_threshold', '30', 'Conditional bonus threshold - balance change percentage (30% = 30)'),
('wagering_multiplier', '0.3', 'Wagering requirement multiplier (0.3 = 30% of deposit, 1.0 = 100%, 2.0 = 200%)')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();





















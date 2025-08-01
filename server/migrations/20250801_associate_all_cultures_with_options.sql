-- +migrate Up
-- SQL to associate all existing cultures with all available culture options
INSERT INTO culture_has_option (culture_id, culture_option_id, created_at, updated_at)
SELECT 
  c.id AS culture_id,
  co.id AS culture_option_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM 
  culture c
CROSS JOIN 
  culture_option co
LEFT JOIN 
  culture_has_option cho ON c.id = cho.culture_id AND co.id = cho.culture_option_id
WHERE 
  cho.id IS NULL; -- Only insert if the association doesn't already exist

-- +migrate Down
-- SQL to remove all culture-option associations that were created by this migration
-- Note: This will only remove associations that were created by this migration
-- and won't affect any manually created associations
DELETE cho FROM culture_has_option cho
INNER JOIN culture c ON cho.culture_id = c.id
INNER JOIN culture_option co ON cho.culture_option_id = co.id
WHERE cho.created_at >= (SELECT MIN(created_at) FROM culture_has_option WHERE created_at > NOW() - INTERVAL 1 MINUTE);

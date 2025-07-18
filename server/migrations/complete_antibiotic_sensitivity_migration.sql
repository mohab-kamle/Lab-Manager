-- =====================================================
-- COMPLETE ANTIBIOTIC SENSITIVITY MIGRATION
-- This migration sets up the complete antibiotic sensitivity feature
-- =====================================================

-- Step 1: Create the medical_report_has_culture_antibiotic junction table
-- (Only if it doesn't exist)
CREATE TABLE IF NOT EXISTS medical_report_has_culture_antibiotic (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medical_report_has_culture_id INT NOT NULL,
  antibiotic_id INT NOT NULL,
  sensitivity ENUM('sensitive', 'moderate', 'resistant') NOT NULL DEFAULT 'moderate',
  zone_size DECIMAL(5,2) NULL COMMENT 'Zone of inhibition in millimeters',
  FOREIGN KEY (medical_report_has_culture_id) REFERENCES medical_report_has_culture(id) ON DELETE CASCADE,
  FOREIGN KEY (antibiotic_id) REFERENCES antibiotic(id) ON DELETE CASCADE,
  UNIQUE KEY unique_culture_antibiotic (medical_report_has_culture_id, antibiotic_id),
  INDEX idx_culture_id (medical_report_has_culture_id),
  INDEX idx_antibiotic_id (antibiotic_id),
  INDEX idx_zone_size (zone_size)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Add zone_size field to existing table (if table already exists)
-- This will only add the column if it doesn't already exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'medical_report_has_culture_antibiotic' 
   AND COLUMN_NAME = 'zone_size') = 0,
  'ALTER TABLE medical_report_has_culture_antibiotic ADD COLUMN zone_size DECIMAL(5,2) NULL COMMENT "Zone of inhibition in millimeters"',
  'SELECT "zone_size column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add index for zone_size if it doesn't exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'medical_report_has_culture_antibiotic' 
   AND INDEX_NAME = 'idx_zone_size') = 0,
  'CREATE INDEX idx_zone_size ON medical_report_has_culture_antibiotic(zone_size)',
  'SELECT "zone_size index already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Ensure the antibiotic table has all required fields
-- Add commercial_name field if it doesn't exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'antibiotic' 
   AND COLUMN_NAME = 'commercial_name') = 0,
  'ALTER TABLE antibiotic ADD COLUMN commercial_name VARCHAR(45) NULL UNIQUE',
  'SELECT "commercial_name column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Update medical_report_has_culture table structure if needed
-- Ensure it has the proper structure for the antibiotic relationship
-- Add any missing indexes or constraints

-- Step 6: Insert some common antibiotics if the table is empty
INSERT IGNORE INTO antibiotic (name, shortcut, commercial_name) VALUES
('Amoxicillin', 'AMX', 'Amoxil'),
('Amoxicillin-Clavulanic Acid', 'AMC', 'Augmentin'),
('Ampicillin', 'AMP', 'Principen'),
('Azithromycin', 'AZM', 'Zithromax'),
('Cefazolin', 'CFZ', 'Ancef'),
('Cefotaxime', 'CTX', 'Claforan'),
('Ceftazidime', 'CAZ', 'Fortaz'),
('Ceftriaxone', 'CRO', 'Rocephin'),
('Cefuroxime', 'CXM', 'Zinacef'),
('Cephalexin', 'LEX', 'Keflex'),
('Chloramphenicol', 'CHL', 'Chloromycetin'),
('Ciprofloxacin', 'CIP', 'Cipro'),
('Clarithromycin', 'CLR', 'Biaxin'),
('Clindamycin', 'CLI', 'Cleocin'),
('Doxycycline', 'DOX', 'Vibramycin'),
('Erythromycin', 'ERY', 'Erythrocin'),
('Gentamicin', 'GEN', 'Garamycin'),
('Imipenem', 'IPM', 'Primaxin'),
('Levofloxacin', 'LVX', 'Levaquin'),
('Linezolid', 'LZD', 'Zyvox'),
('Meropenem', 'MEM', 'Merrem'),
('Metronidazole', 'MTZ', 'Flagyl'),
('Minocycline', 'MIN', 'Minocin'),
('Moxifloxacin', 'MXF', 'Avelox'),
('Nitrofurantoin', 'NIT', 'Macrodantin'),
('Norfloxacin', 'NOR', 'Noroxin'),
('Oxacillin', 'OXA', 'Bactocill'),
('Penicillin G', 'PEN', 'Bicillin'),
('Piperacillin', 'PIP', 'Pipracil'),
('Piperacillin-Tazobactam', 'TZP', 'Zosyn'),
('Rifampin', 'RIF', 'Rifadin'),
('Streptomycin', 'STR', 'Streptomycin'),
('Sulfamethoxazole-Trimethoprim', 'SXT', 'Bactrim'),
('Tetracycline', 'TET', 'Sumycin'),
('Ticarcillin', 'TIC', 'Ticar'),
('Ticarcillin-Clavulanic Acid', 'TIM', 'Timentin'),
('Tigecycline', 'TGC', 'Tygacil'),
('Tobramycin', 'TOB', 'Nebcin'),
('Trimethoprim', 'TMP', 'Proloprim'),
('Vancomycin', 'VAN', 'Vancocin');

-- Step 7: Create a view for easier querying of culture antibiotic data
CREATE OR REPLACE VIEW culture_antibiotic_sensitivity AS
SELECT 
    mrha.id,
    mrha.medical_report_has_culture_id,
    mrha.antibiotic_id,
    mrha.sensitivity,
    mrha.zone_size,
    a.name as antibiotic_name,
    a.shortcut as antibiotic_shortcut,
    a.commercial_name as antibiotic_commercial_name,
    mrhc.medical_report_id,
    mrhc.culture_id,
    c.name as culture_name
FROM medical_report_has_culture_antibiotic mrha
JOIN antibiotic a ON mrha.antibiotic_id = a.id
JOIN medical_report_has_culture mrhc ON mrha.medical_report_has_culture_id = mrhc.id
JOIN culture c ON mrhc.culture_id = c.id;

-- Step 8: Add comments to document the structure
ALTER TABLE medical_report_has_culture_antibiotic 
COMMENT = 'Junction table linking culture results to antibiotic sensitivity testing';

-- Step 9: Verify the migration
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM antibiotic) as total_antibiotics,
    (SELECT COUNT(*) FROM medical_report_has_culture_antibiotic) as total_culture_antibiotics; 
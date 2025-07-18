-- Add zone_size field to medical_report_has_culture_antibiotic table
ALTER TABLE medical_report_has_culture_antibiotic 
ADD COLUMN zone_size DECIMAL(5,2) NULL COMMENT 'Zone of inhibition in millimeters';

-- Add index for better performance
CREATE INDEX idx_culture_antibiotic_zone_size ON medical_report_has_culture_antibiotic(zone_size); 
-- Update medical_report_has_culture table structure to add id column
-- First, drop the existing primary key constraint
ALTER TABLE `medical_report_has_culture` DROP PRIMARY KEY;

-- Add id column as primary key
ALTER TABLE `medical_report_has_culture` 
ADD COLUMN `id` int NOT NULL AUTO_INCREMENT FIRST,
ADD PRIMARY KEY (`id`);

-- Add unique constraint for medical_report_id and culture_id combination
ALTER TABLE `medical_report_has_culture` 
ADD UNIQUE KEY `unique_medical_report_culture` (`medical_report_id`, `culture_id`); 
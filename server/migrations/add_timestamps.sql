-- Add timestamps to medical_report table
ALTER TABLE `medical_report` 
ADD COLUMN `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add timestamps to patient table
ALTER TABLE `patient` 
ADD COLUMN `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing records to have proper timestamps
-- For medical_report, use the date field if available, otherwise use current timestamp
UPDATE `medical_report` 
SET `createdAt` = COALESCE(`date`, NOW()), 
    `updatedAt` = COALESCE(`date`, NOW())
WHERE `createdAt` = CURRENT_TIMESTAMP;

-- For patient, use current timestamp for existing records
-- (This is a reasonable default since we don't have creation dates for existing patients) 
-- Migration to add new fields to existing models
-- Date: 2025-01-15

-- Add new fields to test table
ALTER TABLE `test` 
ADD COLUMN `cost` DECIMAL(10,2) NULL AFTER `price`,
ADD COLUMN `lab_to_lab_status` ENUM('IN','OUT') NULL AFTER `cost`,
ADD COLUMN `lab_name` VARCHAR(100) NULL AFTER `lab_to_lab_status`,
ADD COLUMN `createdAt` DATETIME NULL AFTER `contract_id`,
ADD COLUMN `updatedAt` DATETIME NULL AFTER `createdAt`;

-- Add new fields to test_component table
ALTER TABLE `test_component` 
ADD COLUMN `c_low` VARCHAR(45) NULL AFTER `normal_range`,
ADD COLUMN `c_high` VARCHAR(45) NULL AFTER `c_low`;

-- Add new fields to patient table
ALTER TABLE `patient` 
ADD COLUMN `total` DECIMAL(10,2) NULL DEFAULT 0.00 AFTER `address`,
ADD COLUMN `paid` DECIMAL(10,2) NULL DEFAULT 0.00 AFTER `total`,
ADD COLUMN `due` DECIMAL(10,2) NULL DEFAULT 0.00 AFTER `paid`,
ADD COLUMN `contract_id` INT NULL AFTER `due`,
ADD INDEX `fk_patient_contract1_idx` (`contract_id` ASC),
ADD CONSTRAINT `fk_patient_contract1`
  FOREIGN KEY (`contract_id`)
  REFERENCES `contract` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add new fields to medical_report table
ALTER TABLE `medical_report` 
ADD COLUMN `registered_at` DATETIME NULL AFTER `date`,
ADD COLUMN `collected_at` DATETIME NULL AFTER `registered_at`,
ADD COLUMN `received_at` DATETIME NULL AFTER `collected_at`,
ADD COLUMN `reported_at` DATETIME NULL AFTER `received_at`;

-- Create question table
CREATE TABLE `question` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `text` TEXT NOT NULL,
  `category` VARCHAR(100) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create test_has_question junction table
CREATE TABLE `test_has_question` (
  `test_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  PRIMARY KEY (`test_id`, `question_id`),
  INDEX `fk_test_has_question_question1_idx` (`question_id` ASC),
  CONSTRAINT `fk_test_has_question_test1`
    FOREIGN KEY (`test_id`)
    REFERENCES `test` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_test_has_question_question1`
    FOREIGN KEY (`question_id`)
    REFERENCES `question` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
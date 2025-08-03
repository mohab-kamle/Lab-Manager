-- Create medical_report_culture_result table
CREATE TABLE IF NOT EXISTS `medical_report_culture_result` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_report_has_culture_id` int NOT NULL,
  `culture_option_name` varchar(255) DEFAULT NULL COMMENT 'Static copy of culture option name at time of result entry',
  `culture_sub_option_name` varchar(255) DEFAULT NULL COMMENT 'Static copy of culture sub-option name at time of result entry',
  `custom_result` text COMMENT 'Custom text result when no predefined options are suitable',
  `result_type` enum('option','sub_option','custom') NOT NULL DEFAULT 'custom' COMMENT 'Type of result: option (main option only), sub_option (option + sub-option), custom (free text)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medical_report_has_culture_id` (`medical_report_has_culture_id`),
  KEY `idx_result_type` (`result_type`),
  CONSTRAINT `fk_medical_report_culture_result_medical_report_has_culture` 
    FOREIGN KEY (`medical_report_has_culture_id`) 
    REFERENCES `medical_report_has_culture` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
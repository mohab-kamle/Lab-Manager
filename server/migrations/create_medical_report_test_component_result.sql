-- Create table for storing individual test component results
-- This allows storing separate results for each component of a test (e.g., cholesterol, triglycerides, HDL, LDL in a lipid profile)

CREATE TABLE IF NOT EXISTS `medical_report_test_component_result` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_report_id` int NOT NULL,
  `test_id` int NOT NULL,
  `test_component_id` int NOT NULL,
  `result` varchar(255) DEFAULT NULL,
  `status` enum('pending','done','low','critical low','normal','high','critical high','abnormal') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_component_result` (`medical_report_id`,`test_id`,`test_component_id`),
  KEY `fk_component_result_medical_report_idx` (`medical_report_id`),
  KEY `fk_component_result_test_idx` (`test_id`),
  KEY `fk_component_result_test_component_idx` (`test_component_id`),
  CONSTRAINT `fk_component_result_medical_report` FOREIGN KEY (`medical_report_id`) REFERENCES `medical_report` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_component_result_test` FOREIGN KEY (`test_id`) REFERENCES `test` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_component_result_test_component` FOREIGN KEY (`test_component_id`) REFERENCES `test_component` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add index for faster queries
CREATE INDEX `idx_medical_report_test` ON `medical_report_test_component_result` (`medical_report_id`, `test_id`);

SELECT 'medical_report_test_component_result table created successfully' AS status;
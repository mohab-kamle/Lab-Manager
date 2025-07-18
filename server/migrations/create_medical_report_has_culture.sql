-- Create medical_report_has_culture table (if not exists)
CREATE TABLE IF NOT EXISTS `medical_report_has_culture` (
  `medical_report_id` int NOT NULL,
  `culture_id` int NOT NULL,
  `status` enum('pending','done','normal','abnormal') DEFAULT 'pending',
  `result` text,
  PRIMARY KEY (`medical_report_id`,`culture_id`),
  KEY `fk_medical_report_has_culture_culture1_idx` (`culture_id`),
  KEY `fk_medical_report_has_culture_medical_report1_idx` (`medical_report_id`),
  CONSTRAINT `fk_medical_report_has_culture_culture1` FOREIGN KEY (`culture_id`) REFERENCES `culture` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_medical_report_has_culture_medical_report1` FOREIGN KEY (`medical_report_id`) REFERENCES `medical_report` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 
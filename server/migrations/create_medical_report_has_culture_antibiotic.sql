-- Create medical_report_has_culture_antibiotic junction table
CREATE TABLE `medical_report_has_culture_antibiotic` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_report_has_culture_id` int NOT NULL,
  `antibiotic_id` int NOT NULL,
  `sensitivity` enum('sensitive','moderate','resistant') NOT NULL DEFAULT 'moderate',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_culture_antibiotic` (`medical_report_has_culture_id`,`antibiotic_id`),
  KEY `fk_medical_report_has_culture_antibiotic_medical_report_has_culture_idx` (`medical_report_has_culture_id`),
  KEY `fk_medical_report_has_culture_antibiotic_antibiotic_idx` (`antibiotic_id`),
  CONSTRAINT `fk_medical_report_has_culture_antibiotic_antibiotic` FOREIGN KEY (`antibiotic_id`) REFERENCES `antibiotic` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_medical_report_has_culture_antibiotic_medical_report_has_culture` FOREIGN KEY (`medical_report_has_culture_id`) REFERENCES `medical_report_has_culture` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 
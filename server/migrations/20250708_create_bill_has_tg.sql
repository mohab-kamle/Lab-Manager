-- Migration: Create bill_has_tg table
CREATE TABLE IF NOT EXISTS bill_has_tg (
  bill_id INT NOT NULL,
  tg_id INT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  PRIMARY KEY (bill_id, tg_id),
  CONSTRAINT fk_bill_has_tg_bill1 FOREIGN KEY (bill_id) REFERENCES bill(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bill_has_tg_tg1 FOREIGN KEY (tg_id) REFERENCES test_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX fk_bill_has_tg_bill1_idx ON bill_has_tg (bill_id);
CREATE INDEX fk_bill_has_tg_tg1_idx ON bill_has_tg (tg_id);

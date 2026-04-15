'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dropTableSafe = async (table) => {
      try {
        await queryInterface.dropTable(table);
        console.log(`✅ Dropped: ${table}`);
      } catch (err) {
        console.log(`⚠️ Skipped ${table}: ${err.message}`);
      }
    };

    // 🥇 Step 1: dependent tables
    await dropTableSafe('medical_report_test_component_result');
    await dropTableSafe('medical_report_has_culture_antibiotic');
    await dropTableSafe('medical_report_culture_result');
    await dropTableSafe('medical_report_has_culture');
    await dropTableSafe('medical_report_has_tg');

    await dropTableSafe('bill_has_culture');
    await dropTableSafe('bill_has_tg');
    await dropTableSafe('contract_has_culture');
    await dropTableSafe('pao_has_culture');

    await dropTableSafe('field_comp_options');

    // 🥈 Step 2: TG system
    await dropTableSafe('tg_component');
    await dropTableSafe('tg_fields');
    await dropTableSafe('tgc_category');

    await dropTableSafe('test_group_comments');
    await dropTableSafe('test_group_result');
    await dropTableSafe('test_group');

    // 🥉 Step 3: culture system
    await dropTableSafe('culture_has_option');
    await dropTableSafe('culture_sub_option');
    await dropTableSafe('culture_option');
    await dropTableSafe('culture');

    // 🏁 Step 4: leftovers
    await dropTableSafe('test_component');
  },

  async down(queryInterface, Sequelize) {
    // ❌ No rollback (intentionally)
    console.log('⚠️ This migration is irreversible');
  }
};

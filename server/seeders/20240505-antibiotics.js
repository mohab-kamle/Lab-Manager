'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const antibiotics = [
      { name: 'Amoxicillin', shortcut: 'AMX', commercial_name: 'Amoxil' },
      { name: 'Azithromycin', shortcut: 'AZM', commercial_name: 'Zithromax' },
      { name: 'Ciprofloxacin', shortcut: 'CIP', commercial_name: 'Cipro' },
      { name: 'Ceftriaxone', shortcut: 'CRO', commercial_name: 'Rocephin' },
      { name: 'Doxycycline', shortcut: 'DOX', commercial_name: 'Vibramycin' },
      { name: 'Gentamicin', shortcut: 'GEN', commercial_name: 'Garamycin' },
      { name: 'Levofloxacin', shortcut: 'LVX', commercial_name: 'Levaquin' },
      { name: 'Metronidazole', shortcut: 'MTZ', commercial_name: 'Flagyl' },
      { name: 'Penicillin G', shortcut: 'PEN', commercial_name: 'Pfizerpen' },
      { name: 'Sulfamethoxazole/Trimethoprim', shortcut: 'SXT', commercial_name: 'Bactrim' },
      { name: 'Vancomycin', shortcut: 'VAN', commercial_name: 'Vancocin' },
      { name: 'Erythromycin', shortcut: 'ERY', commercial_name: 'Erythrocin' },
      { name: 'Clindamycin', shortcut: 'CLI', commercial_name: 'Cleocin' },
      { name: 'Nitrofurantoin', shortcut: 'NIT', commercial_name: 'Macrobid' },
      { name: 'Meropenem', shortcut: 'MEM', commercial_name: 'Merrem' },
      { name: 'Imipenem', shortcut: 'IPM', commercial_name: 'Primaxin' },
      { name: 'Piperacillin/Tazobactam', shortcut: 'TZP', commercial_name: 'Zosyn' },
      { name: 'Cefotaxime', shortcut: 'CTX', commercial_name: 'Claforan' },
      { name: 'Ceftazidime', shortcut: 'CAZ', commercial_name: 'Fortaz' },
      { name: 'Amikacin', shortcut: 'AMK', commercial_name: 'Amikin' }
    ];

    await queryInterface.bulkInsert('antibiotic', antibiotics.map(a => ({
      ...a,
      // Handle potential duplicate names by checking if they already exist?
      // Since this is a seeder, we usually assume a clean state or use ignoreDuplicates
    })), { ignoreDuplicates: true });

    console.log(`✅ Seeded ${antibiotics.length} antibiotics.`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('antibiotic', null, {});
  }
};

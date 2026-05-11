'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('bill');
    if (!tableInfo.tax_rate) {
      await queryInterface.addColumn('bill', 'tax_rate', {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
        defaultValue: 0.0000
      });
      
      // Update existing records
      // Calculate tax_rate based on tax and subtotal
      // We use ROUND to ensure precision and avoid long floating point results
      await queryInterface.sequelize.query(`
        UPDATE bill 
        SET tax_rate = ROUND(tax / subtotal, 4) 
        WHERE subtotal > 0 AND tax > 0
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bill', 'tax_rate');
  }
};

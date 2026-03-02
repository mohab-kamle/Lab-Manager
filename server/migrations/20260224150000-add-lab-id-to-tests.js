'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Safe execute helper
        const safeExecute = async (operation, description) => {
            try {
                await operation();
                console.log(`✅ Success: ${description}`);
            } catch (error) {
                console.warn(`⚠️ Warning: Failed to ${description}. Reason: ${error.message}`);
            }
        };

        // Add lab_id to test table
        await safeExecute(async () => {
            await queryInterface.addColumn('test', 'lab_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'lab',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }, 'Add lab_id column to test table');
    },

    down: async (queryInterface, Sequelize) => {
        const safeExecute = async (operation, description) => {
            try {
                await operation();
                console.log(`✅ Success: ${description}`);
            } catch (error) {
                console.warn(`⚠️ Warning: Failed to ${description}. Reason: ${error.message}`);
            }
        };

        // Remove lab_id from test table
        await safeExecute(async () => {
            // First drop foreign key
            const constraints = await queryInterface.showConstraint('test');
            const fkConstraint = constraints.find(c =>
                c.columnNames &&
                c.columnNames.includes('lab_id') &&
                c.constraintType === 'FOREIGN KEY'
            );
            if (fkConstraint && fkConstraint.constraintName) {
                await queryInterface.removeConstraint('test', fkConstraint.constraintName);
            }
            // Then drop column
            await queryInterface.removeColumn('test', 'lab_id');
        }, 'Remove lab_id column from test table');
    }
};

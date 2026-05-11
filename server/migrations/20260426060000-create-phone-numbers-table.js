'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create the new phone_numbers table
<<<<<<< HEAD
    await queryInterface.createTable('phone_numbers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'employee',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'doctor',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'supplier',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lab_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lab',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      type: {
        type: Sequelize.ENUM('personal', 'home', 'work'),
        allowNull: false,
        defaultValue: 'personal'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 2. Add Indexes
    await queryInterface.addIndex('phone_numbers', ['phone']);
    await queryInterface.addIndex('phone_numbers', ['patient_id', 'phone'], {
      unique: true,
      name: 'unique_patient_phone'
    });
    await queryInterface.addIndex('phone_numbers', ['employee_id', 'phone'], {
      unique: true,
      name: 'unique_employee_phone'
    });
=======
    try {
      await queryInterface.createTable('phone_numbers', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'patient',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'employee',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        doctor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'doctor',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'supplier',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        lab_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'lab',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: false
        },
        is_primary: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        type: {
          type: Sequelize.ENUM('personal', 'home', 'work'),
          allowNull: false,
          defaultValue: 'personal'
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
      console.log('✅ Created table: phone_numbers');
    } catch (e) {
      console.log('⚠️ table phone_numbers already exists');
    }

    // 2. Add Indexes
    try { await queryInterface.addIndex('phone_numbers', ['phone']); } catch (e) { }
    try {
      await queryInterface.addIndex('phone_numbers', ['patient_id', 'phone'], {
        unique: true,
        name: 'unique_patient_phone'
      });
    } catch (e) { }
    try {
      await queryInterface.addIndex('phone_numbers', ['employee_id', 'phone'], {
        unique: true,
        name: 'unique_employee_phone'
      });
    } catch (e) { }

>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e

    // 3. Migrate data from old 'phone' table
    try {
      const [oldPhones] = await queryInterface.sequelize.query('SELECT * FROM phone');
      if (oldPhones && oldPhones.length > 0) {
        const newPhones = oldPhones.map(p => ({
          patient_id: p.patient_id,
          employee_id: p.employee_id,
          phone: p.phone_number || '',
          is_primary: p.type === 'primary',
          type: 'personal',
          created_at: new Date(),
          updated_at: new Date()
        })).filter(p => p.phone);

        if (newPhones.length > 0) {
          await queryInterface.bulkInsert('phone_numbers', newPhones);
        }
      }
      
      // 4. Drop the old table (caution: only if data migration was successful)
      await queryInterface.dropTable('phone');
    } catch (error) {
      console.warn('Could not migrate data from old phone table or it does not exist:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Re-create the old phone table if needed for rollback
    await queryInterface.createTable('phone', {
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      phone_number: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      type: Sequelize.ENUM('primary','secondary'),
      allowNull: false
    });
    // (Note: rollback data migration is complex and omitted here for brevity, usually down migrations for data are destructive)
    await queryInterface.dropTable('phone_numbers');
  }
};

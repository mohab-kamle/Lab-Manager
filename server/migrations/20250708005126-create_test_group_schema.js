'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('test_group', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false }
    });
    await queryInterface.createTable('tgc_category', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false }
    });
    await queryInterface.createTable('tg_component', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      test_group_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'test_group', key: 'id' }, onDelete: 'CASCADE' },
      test_category_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'tgc_category', key: 'id' }, onDelete: 'SET NULL' },
      name: { type: Sequelize.STRING(100), allowNull: false }
    });
    await queryInterface.createTable('tg_fields', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      test_group_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'test_group', key: 'id' }, onDelete: 'CASCADE' }
    });
    await queryInterface.createTable('field_comp_options', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      tg_component_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tg_component', key: 'id' }, onDelete: 'CASCADE' },
      tg_fields_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tg_fields', key: 'id' }, onDelete: 'CASCADE' }
    });
    await queryInterface.createTable('medical_report_has_tg', {
      medical_report_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'medical_report', key: 'id' }, primaryKey: true, onDelete: 'CASCADE' },
      test_group_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'test_group', key: 'id' }, primaryKey: true, onDelete: 'CASCADE' },
      value: { type: Sequelize.STRING, allowNull: true }
    });
    await queryInterface.createTable('medical_report_tg_field_value', {
      medical_report_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'medical_report', key: 'id' }, primaryKey: true, onDelete: 'CASCADE' },
      test_group_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'test_group', key: 'id' }, primaryKey: true, onDelete: 'CASCADE' },
      tg_component_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tg_component', key: 'id' }, primaryKey: true, onDelete: 'CASCADE' },
      tg_fields_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tg_fields', key: 'id' }, primaryKey: true, onDelete: 'CASCADE' },
      value: { type: Sequelize.STRING, allowNull: true }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('medical_report_tg_field_value');
    await queryInterface.dropTable('medical_report_has_tg');
    await queryInterface.dropTable('field_comp_options');
    await queryInterface.dropTable('tg_fields');
    await queryInterface.dropTable('tg_component');
    await queryInterface.dropTable('tgc_category');
    await queryInterface.dropTable('test_group');
  }
};

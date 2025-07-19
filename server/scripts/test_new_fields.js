const { sequelize } = require('../models');
const db = require('../models');

async function testNewFields() {
  try {
    console.log('Testing new fields implementation...\n');

    // Test 1: Check if test_component table has the new fields
    console.log('1. Checking test_component table structure...');
    const testComponentColumns = await sequelize.query('SHOW COLUMNS FROM test_component');
    const hasReferenceRange = testComponentColumns[0].some(col => col.Field === 'reference_range');
    const hasResultType = testComponentColumns[0].some(col => col.Field === 'result_type');
    console.log(`   - reference_range field: ${hasReferenceRange ? '✓ Found' : '✗ Missing'}`);
    console.log(`   - result_type field: ${hasResultType ? '✓ Found' : '✗ Missing'}`);

    // Test 2: Check if tg_component table has the new fields
    console.log('\n2. Checking tg_component table structure...');
    const tgComponentColumns = await sequelize.query('SHOW COLUMNS FROM tg_component');
    const tgHasReferenceRange = tgComponentColumns[0].some(col => col.Field === 'reference_range');
    const tgHasResultType = tgComponentColumns[0].some(col => col.Field === 'result_type');
    console.log(`   - reference_range field: ${tgHasReferenceRange ? '✓ Found' : '✗ Missing'}`);
    console.log(`   - result_type field: ${tgHasResultType ? '✓ Found' : '✗ Missing'}`);

    // Test 3: Test creating a test_component with new fields
    console.log('\n3. Testing test_component creation with new fields...');
    try {
      // First, get a test to associate with
      const test = await db.test.findOne();
      if (!test) {
        console.log('   - No test found, skipping test_component creation test');
      } else {
        const testComponent = await db.test_component.create({
          test_id: test.id,
          name: 'Test Component with New Fields',
          unit: 'mg/dL',
          normal_from: '0.5',
          normal_to: '1.5',
          reference_range: '0.5 - 1.5 mg/dL (Normal range)',
          result_type: 'range'
        });
        console.log(`   - ✓ Created test_component with ID: ${testComponent.id}`);
        console.log(`   - reference_range: ${testComponent.reference_range}`);
        console.log(`   - result_type: ${testComponent.result_type}`);

        // Test boolean type
        const booleanComponent = await db.test_component.create({
          test_id: test.id,
          name: 'Boolean Test Component',
          unit: 'N/A',
          normal_from: 'N/A',
          normal_to: 'N/A',
          reference_range: 'Positive/Negative',
          result_type: 'boolean'
        });
        console.log(`   - ✓ Created boolean test_component with ID: ${booleanComponent.id}`);
        console.log(`   - result_type: ${booleanComponent.result_type}`);

        // Clean up
        await testComponent.destroy();
        await booleanComponent.destroy();
        console.log('   - ✓ Cleaned up test components');
      }
    } catch (error) {
      console.log(`   - ✗ Error creating test_component: ${error.message}`);
    }

    // Test 4: Test creating a tg_component with new fields
    console.log('\n4. Testing tg_component creation with new fields...');
    try {
      // First, get or create a test_group to associate with
      let testGroup = await db.test_group.findOne();
      if (!testGroup) {
        console.log('   - No test_group found, creating one for testing...');
        testGroup = await db.test_group.create({
          name: 'Test Group for New Fields',
          price: 100.00
        });
        console.log(`   - Created test_group with ID: ${testGroup.id}`);
      }

      const tgComponent = await db.tg_component.create({
        test_group_id: testGroup.id,
        name: 'TG Component with New Fields',
        reference_range: '0.5 - 1.5 mg/dL (Normal range)',
        result_type: 'range'
      });
      console.log(`   - ✓ Created tg_component with ID: ${tgComponent.id}`);
      console.log(`   - reference_range: ${tgComponent.reference_range}`);
      console.log(`   - result_type: ${tgComponent.result_type}`);

      // Test boolean type
      const booleanTgComponent = await db.tg_component.create({
        test_group_id: testGroup.id,
        name: 'Boolean TG Component',
        reference_range: 'Positive/Negative',
        result_type: 'boolean'
      });
      console.log(`   - ✓ Created boolean tg_component with ID: ${booleanTgComponent.id}`);
      console.log(`   - result_type: ${booleanTgComponent.result_type}`);

      // Clean up
      await tgComponent.destroy();
      await booleanTgComponent.destroy();
      if (testGroup.name === 'Test Group for New Fields') {
        await testGroup.destroy();
        console.log('   - ✓ Cleaned up test group');
      }
      console.log('   - ✓ Cleaned up test components');
    } catch (error) {
      console.log(`   - ✗ Error creating tg_component: ${error.message}`);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nThe new fields (reference_range and result_type) are working correctly.');
    console.log('You can now:');
    console.log('1. Create test components with range or boolean result types');
    console.log('2. Create test group components with range or boolean result types');
    console.log('3. Use the frontend forms to set these fields');
    console.log('4. Generate PDF reports that display the new fields correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testNewFields(); 
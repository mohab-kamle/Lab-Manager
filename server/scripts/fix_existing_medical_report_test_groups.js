const { sequelize } = require('../models');
const db = require('../models');

async function fixExistingMedicalReportTestGroups() {
  try {
    console.log('=== Fixing Existing Medical Report Test Group Associations ===');
    
    // Get all medical reports with their associated bills
    console.log('\n1. Finding medical reports with bills...');
    const [medicalReports] = await sequelize.query(`
      SELECT 
        mr.id as medical_report_id,
        mr.bill_id,
        GROUP_CONCAT(DISTINCT bht.tg_id) as bill_test_groups,
        GROUP_CONCAT(DISTINCT mrht.test_group_id) as current_mr_test_groups
      FROM medical_report mr
      LEFT JOIN bill_has_tg bht ON mr.bill_id = bht.bill_id
      LEFT JOIN medical_report_has_tg mrht ON mr.id = mrht.medical_report_id
      WHERE mr.bill_id IS NOT NULL
      GROUP BY mr.id, mr.bill_id
      ORDER BY mr.id
    `);
    
    console.log(`Found ${medicalReports.length} medical reports with bills`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    
    const transaction = await sequelize.transaction();
    
    try {
      for (const report of medicalReports) {
        const { medical_report_id, bill_id, bill_test_groups, current_mr_test_groups } = report;
        
        if (!bill_test_groups) {
          console.log(`⚠️  Medical report ${medical_report_id}: No test groups in bill ${bill_id}`);
          continue;
        }
        
        const billTestGroupIds = bill_test_groups.split(',').map(id => parseInt(id)).sort();
        const currentMrTestGroupIds = current_mr_test_groups ? 
          current_mr_test_groups.split(',').map(id => parseInt(id)).sort() : [];
        
        // Check if they match
        const billTestGroupsStr = billTestGroupIds.join(',');
        const currentMrTestGroupsStr = currentMrTestGroupIds.join(',');
        
        if (billTestGroupsStr === currentMrTestGroupsStr) {
          console.log(`✅ Medical report ${medical_report_id}: Already correct (${billTestGroupsStr})`);
          alreadyCorrectCount++;
          continue;
        }
        
        console.log(`🔧 Fixing medical report ${medical_report_id}:`);
        console.log(`   Bill test groups: [${billTestGroupsStr}]`);
        console.log(`   Current MR test groups: [${currentMrTestGroupsStr}]`);
        
        // Clear existing associations
        await sequelize.query(
          'DELETE FROM medical_report_has_tg WHERE medical_report_id = ?',
          { replacements: [medical_report_id], transaction }
        );
        
        // Create new associations for all test groups from the bill
        for (const testGroupId of billTestGroupIds) {
          await sequelize.query(
            'INSERT INTO medical_report_has_tg (medical_report_id, test_group_id, value) VALUES (?, ?, NULL)',
            { replacements: [medical_report_id, testGroupId], transaction }
          );
        }
        
        console.log(`   ✅ Updated to: [${billTestGroupsStr}]`);
        fixedCount++;
      }
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    console.log('\n=== Summary ===');
    console.log(`✅ Fixed: ${fixedCount} medical reports`);
    console.log(`ℹ️  Already correct: ${alreadyCorrectCount} medical reports`);
    console.log(`📊 Total processed: ${medicalReports.length} medical reports`);
    
    // Verification
    console.log('\n=== Final Verification ===');
    const [verificationResults] = await sequelize.query(`
      SELECT 
        mr.id as medical_report_id,
        mr.bill_id,
        GROUP_CONCAT(DISTINCT bht.tg_id ORDER BY bht.tg_id) as bill_test_groups,
        GROUP_CONCAT(DISTINCT mrht.test_group_id ORDER BY mrht.test_group_id) as mr_test_groups,
        CASE 
          WHEN GROUP_CONCAT(DISTINCT bht.tg_id ORDER BY bht.tg_id) = GROUP_CONCAT(DISTINCT mrht.test_group_id ORDER BY mrht.test_group_id) 
          THEN 'MATCH' 
          ELSE 'MISMATCH' 
        END as status
      FROM medical_report mr
      LEFT JOIN bill_has_tg bht ON mr.bill_id = bht.bill_id
      LEFT JOIN medical_report_has_tg mrht ON mr.id = mrht.medical_report_id
      WHERE mr.bill_id IS NOT NULL
      GROUP BY mr.id, mr.bill_id
      ORDER BY mr.id
    `);
    
    const matchCount = verificationResults.filter(r => r.status === 'MATCH').length;
    const mismatchCount = verificationResults.filter(r => r.status === 'MISMATCH').length;
    
    console.log(`✅ Matching: ${matchCount}`);
    console.log(`❌ Mismatching: ${mismatchCount}`);
    
    if (mismatchCount > 0) {
      console.log('\nMismatched records:');
      verificationResults.filter(r => r.status === 'MISMATCH').forEach(r => {
        console.log(`  Medical Report ${r.medical_report_id}: Bill[${r.bill_test_groups}] vs MR[${r.mr_test_groups}]`);
      });
    }
    
    if (mismatchCount === 0) {
      console.log('\n🎉 SUCCESS: All medical reports now have correct test group associations!');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixExistingMedicalReportTestGroups();
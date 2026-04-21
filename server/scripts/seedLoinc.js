const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { global_test_catalog, categories_test_and_culture } = require(path.join(__dirname, '../models')); 

const getDataPath = (fileName) => path.join(__dirname, '../data', fileName);

const processCSV = (filePath, onData) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`[Warning] File not found, skipping: ${filePath}`);
      return resolve();
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', onData)
      .on('end', resolve);
  });
};

// Translates LOINC abbreviations into clean UI department names
const departmentDictionary = {
  'CHEM': 'Chemistry',
  'MICRO': 'Microbiology',
  'HEM/BC': 'Hematology',
  'COAG': 'Coagulation',
  'SERO': 'Serology',
  'UA': 'Urinalysis',
  'TOX': 'Toxicology',
  'BLDBK': 'Blood Bank',
  'ABXBACT': 'Antibiotic Susceptibility',
  'CELLMARK': 'Cell Markers',
  'DRUG/TOX': 'Drug Toxicology',
  'ALLERGY': 'Allergy'
};

async function runETL() {
  console.log("Starting Smart LIMS Master ETL Pipeline...");
  
  const catalog = new Map();
  const answerDictionary = new Map(); 
  const missingChildrenIds = new Set(); 

  // ==========================================
  // PHASE 1: THE BASE LAYER 
  // ==========================================
  console.log("1. Extracting Core Tests...");
  await processCSV(getDataPath('loinc.csv'), (row) => {
    if (row.CLASSTYPE === '1' && row.STATUS === 'ACTIVE') {
      const isCulture = (row.CLASS === 'MICRO' || row.CLASS === 'ABXBACT');
      const cleanedTags = row.RELATEDNAMES2 ? row.RELATEDNAMES2.replace(/;/g, ' ') : '';
      
      // Look up the clean department name, fallback to the raw abbreviation if not found
      const cleanDepartment = departmentDictionary[row.CLASS] || 'Others';

      catalog.set(row.LOINC_NUM, {
        loinc_code: row.LOINC_NUM,
        name: row.LONG_COMMON_NAME,
        type: 'single', 
        order_rank: row.COMMON_ORDER_RANK ? parseInt(row.COMMON_ORDER_RANK) : null,
        patient_friendly_name: null, // Will be filled in Phase 3.5
        search_tags: cleanedTags, 
        global_category: cleanDepartment, // Direct injection!
        default_structure: {
          ui_type: 'numeric', 
          is_culture: isCulture, // Permanent flag for Ziad's UI
          component: row.COMPONENT,
          property: row.PROPERTY,
          time_aspect: row.TIME_ASPCT,
          system: row.SYSTEM,
          scale: row.SCALE_TYP,
          method: row.METHOD_TYP,
          loinc_class: row.CLASS,
          formula: row.FORMULA || null,
          example_answers: row.EXMPL_ANSWERS || null,
          units_required: row.UNITSREQUIRED === 'Y', 
          short_name: row.SHORTNAME,
          order_obs: row.ORDER_OBS,
          units: row.EXAMPLE_UNITS || null,
          ucum_units: row.EXAMPLE_UCUM_UNITS || null
        }
      });
    }
  });

  // ==========================================
  // PHASE 2: THE HIERARCHY LAYER 
  // ==========================================
  console.log("2. Assembling Panels and Tracking Missing Children...");
  await processCSV(getDataPath('PanelsAndForms.csv'), (row) => {
    if (catalog.has(row.ParentLoinc)) {
      const parent = catalog.get(row.ParentLoinc);
      parent.type = 'panel'; 
      
      if (!parent.default_structure.children) parent.default_structure.children = [];
      
      const exists = parent.default_structure.children.some(child => child.code === row.Loinc);
      if (!exists) {
        parent.default_structure.children.push({ code: row.Loinc, seq: row.SEQUENCE });
      }

      if (!catalog.has(row.Loinc)) {
        missingChildrenIds.add(row.Loinc);
      }
    }
  });

  // ==========================================
  // PHASE 3: THE BACKFILL (Rescue Mission)
  // ==========================================
  if (missingChildrenIds.size > 0) {
    console.log(`3. Backfilling ${missingChildrenIds.size} missing subtests from loinc.csv...`);
    await processCSV(getDataPath('loinc.csv'), (row) => {
      if (missingChildrenIds.has(row.LOINC_NUM) && row.STATUS === 'ACTIVE') {
        const isCulture = (row.CLASS === 'MICRO' || row.CLASS === 'ABXBACT');
        const cleanedTags = row.RELATEDNAMES2 ? row.RELATEDNAMES2.replace(/;/g, ' ') : '';
        const cleanDepartment = departmentDictionary[row.CLASS] || 'Others';

        catalog.set(row.LOINC_NUM, {
          loinc_code: row.LOINC_NUM,
          name: row.LONG_COMMON_NAME,
          type: 'single', 
          order_rank: row.COMMON_ORDER_RANK ? parseInt(row.COMMON_ORDER_RANK) : null,
          patient_friendly_name: null,
          search_tags: cleanedTags, 
          global_category: cleanDepartment, 
          default_structure: {
            ui_type: 'numeric', 
            is_culture: isCulture, 
            component: row.COMPONENT,
            property: row.PROPERTY,
            time_aspect: row.TIME_ASPCT,
            system: row.SYSTEM,
            scale: row.SCALE_TYP,
            method: row.METHOD_TYP,
            loinc_class: row.CLASS,
            formula: row.FORMULA || null,
            example_answers: row.EXMPL_ANSWERS || null,
            units_required: row.UNITSREQUIRED === 'Y', 
            short_name: row.SHORTNAME,
            order_obs: row.ORDER_OBS,
            units: row.EXAMPLE_UNITS || null,
            ucum_units: row.EXAMPLE_UCUM_UNITS || null
          }
        });
      }
    });
  }

  // ==========================================
  // PHASE 3.5: CONSUMER NAMES
  // ==========================================
  console.log("3.5. Merging Patient Friendly Names from ConsumerName.csv...");
  await processCSV(getDataPath('ConsumerName.csv'), (row) => {
    // Dynamic fallback for CamelCase vs UPPERCASE headers
    const loincId = row.LoincNumber || row.LOINC_NUM;
    const consumerName = row.ConsumerName || row.CONSUMER_NAME;

    if (loincId && catalog.has(loincId) && consumerName) {
      catalog.get(loincId).patient_friendly_name = consumerName;
    }
  });

  // ==========================================
  // PHASE 4: THE UI LAYER (Dropdowns)
  // ==========================================
  console.log("4. Injecting Dropdown Answers (Relational Mapping)...");
  await processCSV(getDataPath('AnswerList.csv'), (row) => {
    if (row.DisplayText) {
      if (!answerDictionary.has(row.AnswerListId)) {
        answerDictionary.set(row.AnswerListId, []);
      }
      if (!answerDictionary.get(row.AnswerListId).includes(row.DisplayText)) {
          answerDictionary.get(row.AnswerListId).push(row.DisplayText);
      }
    }
  });

  await processCSV(getDataPath('LoincAnswerListLink.csv'), (row) => {
    if (catalog.has(row.LoincNumber) && answerDictionary.has(row.AnswerListId)) {
      const entry = catalog.get(row.LoincNumber);
      entry.default_structure.ui_type = 'options';
      entry.default_structure.options = answerDictionary.get(row.AnswerListId);
    }
  });

  // ==========================================
  // PHASE 5: DATABASE INSERTION
  // ==========================================
  console.log("5. Formatting and saving to MySQL...");
  const finalData = Array.from(catalog.values()).map(item => ({
    ...item,
    default_structure: JSON.stringify(item.default_structure)
  }));

  try {
    await global_test_catalog.bulkCreate(finalData, {
      updateOnDuplicate: [
        'name', 'type', 'order_rank', 'patient_friendly_name', 
        'search_tags', 'global_category', 'default_structure'
      ]
    });
    console.log(`\n✅ Success! Inserted ${finalData.length} records into the Global Catalog.`);
    
    // Seed standard categories
    const uniqueCategories = [...new Set(finalData.map(item => item.global_category).filter(Boolean))];
    const categoriesData = uniqueCategories.map(name => ({ name }));
    console.log(`5.5. Ensuring ${categoriesData.length} categories exist...`);
    if (categories_test_and_culture) {
      await categories_test_and_culture.bulkCreate(categoriesData, { ignoreDuplicates: true });
      console.log(`✅ Success! Unique categories secured.`);
    }

  } catch (error) {
    console.error("❌ Database Error:", error);
  }
}

runETL();
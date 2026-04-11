var DataTypes = require("sequelize").DataTypes;
var _admin = require("./admin");
var _admin_packages_and_offers = require("./admin_packages_and_offers");
var _antibiotic = require("./antibiotic");
var _bill = require("./bill");
var _bill_has_culture = require("./bill_has_culture");
var _bill_has_payment_method = require("./bill_has_payment_method");
var _bill_has_test = require("./bill_has_test");
var _bill_has_package = require("./bill_has_package");
var _branch = require("./branch");
var _branch_has_employee = require("./branch_has_employee");
var _categories_test_and_culture = require("./categories_test_and_culture");
var _chemist = require("./chemist");
var _company = require("./company");
var _contract = require("./contract");
var _contract_has_culture = require("./contract_has_culture");
var _contract_has_test = require("./contract_has_test");
var _culture = require("./culture");
var _culture_option = require("./culture_option");
var _diseases = require("./diseases");
var _doctor = require("./doctor");
var _employee = require("./employee");
var _lab = require("./lab");
var _lab_contracts_company = require("./lab_contracts_company");
var _lab_contracts_doctor = require("./lab_contracts_doctor");
var _lab_settings = require("./lab_settings");
var _lab_activity_log = require("./lab_activity_log");
var _test_group_result = require("./test_group_result");
var _medical_report = require("./medical_report");
var _medical_report_has_test = require("./medical_report_has_test");
var _medical_report_has_culture = require("./medical_report_has_culture");
var _packages_and_offers = require("./packages_and_offers");
var _pao_has_culture = require("./pao_has_culture");
var _pao_has_test = require("./pao_has_test");
var _patient = require("./patient");
var _patient_has_diseases = require("./patient_has_diseases");
var _payment_method = require("./payment_method");
var _phone = require("./phone");
var _question = require("./question");
var _receptionist = require("./receptionist");
var _referral = require("./referral");
var _sample_type = require("./sample_type");
var _status = require("./status");
var _test = require("./test");
var _test_component = require("./test_component");
var _test_group = require("./test_group");
var _test_has_question = require("./test_has_question");
var _tgc_category = require("./tgc_category");
var _tg_component = require("./tg_component");
var _tg_fields = require("./tg_fields");
var _field_comp_options = require("./field_comp_options");
// var _medical_report_tg_field_value = require("./medical_report_tg_field_value"); // Removed - migrated to test_group_result
var _medical_report_has_tg = require("./medical_report_has_tg");
var _bill_has_tg = require("./bill_has_tg");
var _medical_report_has_culture_antibiotic = require("./medical_report_has_culture_antibiotic");
var _medical_report_culture_result = require("./medical_report_culture_result");
var _medical_report_test_component_result = require("./medical_report_test_component_result");
var _culture_has_option = require("./culture_has_option");
var _culture_sub_option = require("./culture_sub_option");
var _lab_settings = require("./lab_settings");
var _lab_activity_log = require("./lab_activity_log");
var _lab_payment = require("./lab_payment");
var _subscription = require("./subscription");
var _test_comments = require("./test_comments");
var _test_group_comments = require("./test_group_comments");
var _comment_images = require("./comment_images");
var _supplier = require("./supplier");
var _inventory_item = require("./inventory_item");
var _inventory_batch = require("./inventory_batch");
var _inventory_transaction = require("./inventory_transaction");
var _inventory_notification = require("./inventory_notification");

function initModels(sequelize) {
  var admin = _admin(sequelize, DataTypes);
  var admin_packages_and_offers = _admin_packages_and_offers(sequelize, DataTypes);
  var antibiotic = _antibiotic(sequelize, DataTypes);
  var bill = _bill(sequelize, DataTypes);
  var bill_has_culture = _bill_has_culture(sequelize, DataTypes);
  var bill_has_payment_method = _bill_has_payment_method(sequelize, DataTypes);
  var bill_has_test = _bill_has_test(sequelize, DataTypes);
  var bill_has_package = _bill_has_package(sequelize, DataTypes);
  var branch = _branch(sequelize, DataTypes);
  var branch_has_employee = _branch_has_employee(sequelize, DataTypes);
  var categories_test_and_culture = _categories_test_and_culture(
    sequelize,
    DataTypes
  );
  var chemist = _chemist(sequelize, DataTypes);
  var company = _company(sequelize, DataTypes);
  var contract = _contract(sequelize, DataTypes);
  var contract_has_culture = _contract_has_culture(sequelize, DataTypes);
  var contract_has_test = _contract_has_test(sequelize, DataTypes);
  var culture = _culture(sequelize, DataTypes);
  var culture_option = _culture_option(sequelize, DataTypes);
  var diseases = _diseases(sequelize, DataTypes);
  var doctor = _doctor(sequelize, DataTypes);
  var employee = _employee(sequelize, DataTypes);
  var lab = _lab(sequelize, DataTypes);
  var lab_contracts_company = _lab_contracts_company(sequelize, DataTypes);
  var lab_contracts_doctor = _lab_contracts_doctor(sequelize, DataTypes);
  var lab_settings = _lab_settings(sequelize, DataTypes);
  var lab_activity_log = _lab_activity_log(sequelize, DataTypes);
  var lab_payment = _lab_payment(sequelize, DataTypes);
  var test_group_result = _test_group_result(sequelize, DataTypes);
  var medical_report = _medical_report(sequelize, DataTypes);
  var medical_report_has_test = _medical_report_has_test(sequelize, DataTypes);
  var medical_report_has_culture = _medical_report_has_culture(sequelize, DataTypes);
  var packages_and_offers = _packages_and_offers(sequelize, DataTypes);
  var pao_has_culture = _pao_has_culture(
    sequelize,
    DataTypes
  );
  var pao_has_test = _pao_has_test(
    sequelize,
    DataTypes
  );
  var patient = _patient(sequelize, DataTypes);
  var patient_has_diseases = _patient_has_diseases(sequelize, DataTypes);
  var payment_method = _payment_method(sequelize, DataTypes);
  var phone = _phone(sequelize, DataTypes);
  var question = _question(sequelize, DataTypes);
  var receptionist = _receptionist(sequelize, DataTypes);
  var referral = _referral(sequelize, DataTypes);
  var sample_type = _sample_type(sequelize, DataTypes);
  var status = _status(sequelize, DataTypes);
  var test = _test(sequelize, DataTypes);
  var test_component = _test_component(sequelize, DataTypes);
  var test_group = _test_group(sequelize, DataTypes);
  var test_has_question = _test_has_question(sequelize, DataTypes);
  var tgc_category = _tgc_category(sequelize, DataTypes);
  var tg_component = _tg_component(sequelize, DataTypes);
  var tg_fields = _tg_fields(sequelize, DataTypes);
  var field_comp_options = _field_comp_options(sequelize, DataTypes);
  // var medical_report_tg_field_value = _medical_report_tg_field_value(sequelize, DataTypes); // Removed - migrated to test_group_result
  var medical_report_has_tg = _medical_report_has_tg(sequelize, DataTypes);
  var bill_has_tg = _bill_has_tg(sequelize, DataTypes);
  var medical_report_has_culture_antibiotic = _medical_report_has_culture_antibiotic(sequelize, DataTypes);
  var medical_report_culture_result = _medical_report_culture_result(sequelize, DataTypes);
  var medical_report_test_component_result = _medical_report_test_component_result(sequelize, DataTypes);
  var culture_has_option = _culture_has_option(sequelize, DataTypes);
  var culture_sub_option = _culture_sub_option(sequelize, DataTypes);
  var lab_settings = _lab_settings(sequelize, DataTypes);
  var lab_activity_log = _lab_activity_log(sequelize, DataTypes);
  var subscription = _subscription(sequelize, DataTypes);
  var test_comments = _test_comments(sequelize, DataTypes);
  var test_group_comments = _test_group_comments(sequelize, DataTypes);
  var comment_images = _comment_images(sequelize, DataTypes);
  var supplier = _supplier(sequelize, DataTypes);
  var inventory_item = _inventory_item(sequelize, DataTypes);
  var inventory_batch = _inventory_batch(sequelize, DataTypes);
  var inventory_transaction = _inventory_transaction(sequelize, DataTypes);
  var inventory_notification = _inventory_notification(sequelize, DataTypes);

  // Add many-to-many association between test and question
  test.belongsToMany(question, {
    as: "questions",
    through: test_has_question,
    foreignKey: "test_id",
    otherKey: "question_id",
  });
  question.belongsToMany(test, {
    as: "tests",
    through: test_has_question,
    foreignKey: "question_id",
    otherKey: "test_id",
  });

  // Add association between patient and contract
  patient.belongsTo(contract, { as: "contract", foreignKey: "contract_id" });
  contract.hasMany(patient, { as: "patients", foreignKey: "contract_id" });

  // Add association between patient and referral
  patient.belongsTo(referral, { as: "referral", foreignKey: "referral_id" });
  referral.hasMany(patient, { as: "patients", foreignKey: "referral_id" });

  admin.belongsToMany(packages_and_offers, {
    as: "package_id_packages_and_offers",
    through: admin_packages_and_offers,
    foreignKey: "admin_id",
    otherKey: "package_and_offer_id",
  });
  bill.belongsToMany(culture, {
    as: "culture_id_cultures",
    through: bill_has_culture,
    foreignKey: "bill_id",
    otherKey: "culture_id",
  });
  bill.belongsToMany(payment_method, {
    as: "payment_method_id_payment_methods",
    through: bill_has_payment_method,
    foreignKey: "bill_id",
    otherKey: "payment_method_id",
  });
  bill.belongsToMany(test, {
    as: "test_id_tests",
    through: bill_has_test,
    foreignKey: "bill_id",
    otherKey: "test_id",
  });
  bill.belongsToMany(packages_and_offers, {
    as: "package_id_packages_and_offers",
    through: bill_has_package,
    foreignKey: "bill_id",
    otherKey: "package_id",
  });
  bill.belongsToMany(test_group, {
    as: "tg_id_test_groups",
    through: bill_has_tg,
    foreignKey: "bill_id",
    otherKey: "tg_id",
  });
  contract.belongsToMany(culture, {
    as: "culture_id_culture_contract_has_cultures",
    through: contract_has_culture,
    foreignKey: "contract_id",
    otherKey: "culture_id",
  });
  contract.belongsToMany(test, {
    as: "test_id_test_contract_has_tests",
    through: contract_has_test,
    foreignKey: "contract_id",
    otherKey: "test_id",
  });
  culture.belongsToMany(bill, {
    as: "bill_id_bills",
    through: bill_has_culture,
    foreignKey: "culture_id",
    otherKey: "bill_id",
  });
  culture.belongsToMany(contract, {
    as: "contract_id_contracts",
    through: contract_has_culture,
    foreignKey: "culture_id",
    otherKey: "contract_id",
  });
  culture.belongsToMany(packages_and_offers, {
    as: "package_id_packages_and_offers_pao_has_cultures",
    through: pao_has_culture,
    foreignKey: "culture_id",
    otherKey: "packages_and_offers_id",
  });
  diseases.belongsToMany(patient, {
    as: "patient_id_patients",
    through: patient_has_diseases,
    foreignKey: "diseases_id",
    otherKey: "patient_id",
  });
  medical_report.belongsToMany(test, {
    as: "tests",
    through: medical_report_has_test,
    foreignKey: "medical_report_id",
    otherKey: "test_id",
  });
  medical_report.belongsToMany(test_group, {
    as: "tg_id_test_groups",
    through: medical_report_has_tg,
    foreignKey: "medical_report_id",
    otherKey: "test_group_id",
  });
  test_group.belongsToMany(medical_report, {
    as: "medical_reports",
    through: medical_report_has_tg,
    foreignKey: "test_group_id",
    otherKey: "medical_report_id",
  });
  medical_report.belongsToMany(culture, {
    as: "cultures",
    through: medical_report_has_culture,
    foreignKey: "medical_report_id",
    otherKey: "culture_id",
  });
  culture.belongsToMany(medical_report, {
    as: "medical_report_id_medical_reports",
    through: medical_report_has_culture,
    foreignKey: "culture_id",
    otherKey: "medical_report_id",
  });
  packages_and_offers.belongsToMany(admin, {
    as: "admin_id_admins",
    through: admin_packages_and_offers,
    foreignKey: "package_and_offer_id",
    otherKey: "admin_id",
  });
  packages_and_offers.belongsToMany(culture, {
    as: "culture_id_culture_pao_has_cultures",
    through: pao_has_culture,
    foreignKey: "packages_and_offers_id",
    otherKey: "culture_id",
  });
  packages_and_offers.belongsToMany(test, {
    as: "test_id_test_pao_has_tests",
    through: pao_has_test,
    foreignKey: "packages_and_offers_id",
    otherKey: "test_id",
  });
  packages_and_offers.belongsToMany(bill, {
    as: "bill_id_bills",
    through: bill_has_package,
    foreignKey: "package_id",
    otherKey: "bill_id",
  });
  patient.belongsToMany(diseases, {
    as: "diseases_id_diseases",
    through: patient_has_diseases,
    foreignKey: "patient_id",
    otherKey: "diseases_id",
  });
  payment_method.belongsToMany(bill, {
    as: "bill_id_bill_bill_has_payment_methods",
    through: bill_has_payment_method,
    foreignKey: "payment_method_id",
    otherKey: "bill_id",
  });
  test.belongsToMany(bill, {
    as: "bill_id_bill_bill_has_tests",
    through: bill_has_test,
    foreignKey: "test_id",
    otherKey: "bill_id",
  });
  test.belongsToMany(contract, {
    as: "contract_id_contract_contract_has_tests",
    through: contract_has_test,
    foreignKey: "test_id",
    otherKey: "contract_id",
  });
  test.belongsToMany(medical_report, {
    as: "medical_report_id_medical_reports",
    through: medical_report_has_test,
    foreignKey: "test_id",
    otherKey: "medical_report_id",
  });
  test_group.belongsToMany(medical_report, {
    as: "medical_report_id_medical_reports",
    through: medical_report_has_tg,
    foreignKey: "test_group_id",
    otherKey: "medical_report_id",
  })
  test.belongsToMany(packages_and_offers, {
    as: "package_id_packages_and_offers_pao_has_tests",
    through: pao_has_test,
    foreignKey: "test_id",
    otherKey: "packages_and_offers_id",
  });
  admin_packages_and_offers.belongsTo(admin, {
    as: "admin",
    foreignKey: "admin_id",
  });
  admin.hasMany(admin_packages_and_offers, {
    as: "admin_packages_and_offers",
    foreignKey: "admin_id",
  });
  branch.belongsTo(admin, { as: "manager", foreignKey: "manager_id" });
  admin.hasMany(branch, { as: "branches", foreignKey: "manager_id" });
  medical_report.belongsTo(admin, {
    as: "signatory_admin",
    foreignKey: "signatory_admin_id",
  });
  admin.hasMany(medical_report, {
    as: "medical_reports",
    foreignKey: "signatory_admin_id",
  });
  bill_has_culture.belongsTo(bill, { as: "bill", foreignKey: "bill_id" });
  bill.hasMany(bill_has_culture, {
    as: "bill_has_cultures",
    foreignKey: "bill_id",
  });
  bill_has_payment_method.belongsTo(bill, {
    as: "bill",
    foreignKey: "bill_id",
  });
  bill.hasMany(bill_has_payment_method, {
    as: "bill_has_payment_methods",
    foreignKey: "bill_id",
  });
  bill_has_test.belongsTo(bill, { as: "bill", foreignKey: "bill_id" });
  bill.hasMany(bill_has_test, { as: "bill_has_tests", foreignKey: "bill_id" });
  branch_has_employee.belongsTo(branch, {
    as: "branch",
    foreignKey: "branch_id",
  });
  branch.hasMany(branch_has_employee, {
    as: "branch_has_employees",
    foreignKey: "branch_id",
  });
  branch_has_employee.belongsTo(employee, {
    as: "branch_employee",
    foreignKey: "employee_id",
  });
  employee.hasMany(branch_has_employee, {
    as: "branch_has_employees",
    foreignKey: "employee_id",
  });
  culture.belongsTo(categories_test_and_culture, {
    as: "category",
    foreignKey: "category_id",
  });
  categories_test_and_culture.hasMany(culture, {
    as: "cultures",
    foreignKey: "category_id",
  });
  test.belongsTo(categories_test_and_culture, {
    as: "category",
    foreignKey: "category_id",
  });
  categories_test_and_culture.hasMany(test, {
    as: "tests",
    foreignKey: "category_id",
  });
  medical_report.belongsTo(chemist, {
    as: "signatory",
    foreignKey: "signatory_id",
  });
  chemist.hasMany(medical_report, {
    as: "medical_reports",
    foreignKey: "signatory_id",
  });
  lab_contracts_company.belongsTo(company, {
    as: "company",
    foreignKey: "company_id",
  });
  company.hasMany(lab_contracts_company, {
    as: "lab_contracts_companies",
    foreignKey: "company_id",
  });
  contract_has_culture.belongsTo(contract, {
    as: "contract",
    foreignKey: "contract_id",
  });
  contract.hasMany(contract_has_culture, {
    as: "contract_has_cultures",
    foreignKey: "contract_id",
  });
  contract_has_test.belongsTo(contract, {
    as: "contract",
    foreignKey: "contract_id",
  });
  contract.hasMany(contract_has_test, {
    as: "contract_has_tests",
    foreignKey: "contract_id",
  });
  lab_contracts_company.belongsTo(contract, {
    as: "contract",
    foreignKey: "contract_id",
  });
  contract.hasMany(lab_contracts_company, {
    as: "lab_contracts_companies",
    foreignKey: "contract_id",
  });
  lab_contracts_doctor.belongsTo(contract, {
    as: "contract",
    foreignKey: "contract_id",
  });
  contract.hasMany(lab_contracts_doctor, {
    as: "lab_contracts_doctors",
    foreignKey: "contract_id",
  });
  test.belongsTo(contract, { as: "contract", foreignKey: "contract_id" });
  contract.hasMany(test, { as: "tests", foreignKey: "contract_id" });
  bill_has_culture.belongsTo(culture, {
    as: "culture",
    foreignKey: "culture_id",
  });
  culture.hasMany(bill_has_culture, {
    as: "bill_has_cultures",
    foreignKey: "culture_id",
  });
  contract_has_culture.belongsTo(culture, {
    as: "culture",
    foreignKey: "culture_id",
  });
  culture.hasMany(contract_has_culture, {
    as: "contract_has_cultures",
    foreignKey: "culture_id",
  });
  pao_has_culture.belongsTo(culture, {
    as: "culture",
    foreignKey: "culture_id",
  });
  culture.hasMany(pao_has_culture, {
    as: "pao_has_cultures",
    foreignKey: "culture_id",
  });
  patient_has_diseases.belongsTo(diseases, {
    as: "disease",
    foreignKey: "diseases_id",
  });
  diseases.hasMany(patient_has_diseases, {
    as: "patient_has_diseases",
    foreignKey: "diseases_id",
  });
  lab_contracts_doctor.belongsTo(doctor, {
    as: "doctor",
    foreignKey: "doctor_id",
  });
  doctor.hasMany(lab_contracts_doctor, {
    as: "lab_contracts_doctors",
    foreignKey: "doctor_id",
  });
  admin.belongsTo(employee, { as: "id_employee", foreignKey: "id" });
  employee.hasOne(admin, { as: "admin", foreignKey: "id" });
  chemist.belongsTo(employee, { as: "id_employee", foreignKey: "id" });
  employee.hasOne(chemist, { as: "chemist", foreignKey: "id" });
  phone.belongsTo(employee, { as: "employee", foreignKey: "employee_id" });
  employee.hasMany(phone, { as: "phones", foreignKey: "employee_id" });
  receptionist.belongsTo(employee, { as: "id_employee", foreignKey: "id" });
  employee.hasOne(receptionist, { as: "receptionist", foreignKey: "id" });
  branch.belongsTo(lab, { as: "branch_lab", foreignKey: "lab_id" });
  lab.hasMany(branch, { as: "lab_branches", foreignKey: "lab_id" });
  lab_contracts_company.belongsTo(lab, { as: "company_lab", foreignKey: "lab_id" });
  lab.hasMany(lab_contracts_company, { as: "lab_company_contracts", foreignKey: "lab_id" });
  lab_contracts_doctor.belongsTo(lab, { as: "doctor_lab", foreignKey: "lab_id" });
  lab.hasMany(lab_contracts_doctor, { as: "lab_doctor_contracts", foreignKey: "lab_id" });
  medical_report_has_test.belongsTo(medical_report, {
    as: "medical_report",
    foreignKey: "medical_report_id",
  });
  medical_report.hasMany(medical_report_has_test, {
    as: "medical_report_has_tests",
    foreignKey: "medical_report_id",
  });
  medical_report_has_culture.belongsTo(medical_report, {
    as: "medical_report",
    foreignKey: "medical_report_id",
  });
  medical_report.hasMany(medical_report_has_culture, {
    as: "medical_report_has_cultures",
    foreignKey: "medical_report_id",
  });
  medical_report_has_culture.belongsTo(culture, {
    as: "culture",
    foreignKey: "culture_id",
  });
  culture.hasMany(medical_report_has_culture, {
    as: "medical_report_has_cultures",
    foreignKey: "culture_id",
  });
  admin_packages_and_offers.belongsTo(packages_and_offers, {
    as: "packages_and_offer",
    foreignKey: "package_and_offer_id",
  });
  packages_and_offers.hasMany(admin_packages_and_offers, {
    as: "admin_packages_and_offers",
    foreignKey: "package_and_offer_id",
  });
  pao_has_culture.belongsTo(packages_and_offers, {
    as: "packages_and_offer",
    foreignKey: "packages_and_offers_id",
  });
  packages_and_offers.hasMany(pao_has_culture, {
    as: "pao_has_cultures",
    foreignKey: "packages_and_offers_id",
  });
  pao_has_test.belongsTo(packages_and_offers, {
    as: "packages_and_offer",
    foreignKey: "packages_and_offers_id",
  });
  packages_and_offers.hasMany(pao_has_test, {
    as: "pao_has_tests",
    foreignKey: "packages_and_offers_id",
  });
  bill.belongsTo(patient, { as: "patient", foreignKey: "patient_id" });
  patient.hasMany(bill, { as: "bills", foreignKey: "patient_id" });
  medical_report.belongsTo(patient, {
    as: "patient",
    foreignKey: "patient_id",
  });
  patient.hasMany(medical_report, {
    as: "medical_reports",
    foreignKey: "patient_id",
  });
  medical_report.belongsTo(bill, {
    as: "bill",
    foreignKey: "bill_id",
  });
  bill.hasMany(medical_report, {
    as: "medical_reports",
    foreignKey: "bill_id",
  });
  patient_has_diseases.belongsTo(patient, {
    as: "patient",
    foreignKey: "patient_id",
  });
  patient.hasMany(patient_has_diseases, {
    as: "patient_has_diseases",
    foreignKey: "patient_id",
  });
  phone.belongsTo(patient, { as: "patient", foreignKey: "patient_id" });
  patient.hasMany(phone, { as: "phones", foreignKey: "patient_id" });
  bill_has_payment_method.belongsTo(payment_method, {
    as: "payment_method",
    foreignKey: "payment_method_id",
  });
  payment_method.hasMany(bill_has_payment_method, {
    as: "bill_has_payment_methods",
    foreignKey: "payment_method_id",
  });
  bill.belongsTo(receptionist, {
    as: "receptionist",
    foreignKey: "receptionist_id",
  });
  receptionist.hasMany(bill, { as: "bills", foreignKey: "receptionist_id" });
  culture.belongsTo(sample_type, {
    as: "sample_type",
    foreignKey: "sample_type_id",
  });
  sample_type.hasMany(culture, {
    as: "cultures",
    foreignKey: "sample_type_id",
  });
  test.belongsTo(sample_type, {
    as: "sample_type",
    foreignKey: "sample_type_id",
  });
  sample_type.hasMany(test, { as: "tests", foreignKey: "sample_type_id" });
  bill.belongsTo(status, { as: "status", foreignKey: "status_id" });
  status.hasMany(bill, { as: "bills", foreignKey: "status_id" });
  bill_has_test.belongsTo(test, { as: "test", foreignKey: "test_id" });
  test.hasMany(bill_has_test, { as: "bill_has_tests", foreignKey: "test_id" });
  bill_has_package.belongsTo(bill, { as: "bill", foreignKey: "bill_id" });
  bill.hasMany(bill_has_package, { as: "bill_has_packages", foreignKey: "bill_id" });
  bill_has_package.belongsTo(packages_and_offers, { as: "package", foreignKey: "package_id" });
  packages_and_offers.hasMany(bill_has_package, { as: "bill_has_packages", foreignKey: "package_id" });
  contract_has_test.belongsTo(test, { as: "test", foreignKey: "test_id" });
  test.hasMany(contract_has_test, {
    as: "contract_has_tests",
    foreignKey: "test_id",
  });
  medical_report_has_test.belongsTo(test, {
    as: "test",
    foreignKey: "test_id",
  });
  test.hasMany(medical_report_has_test, {
    as: "medical_report_has_tests",
    foreignKey: "test_id",
  });
  pao_has_test.belongsTo(test, {
    as: "test",
    foreignKey: "test_id",
  });
  test.hasMany(pao_has_test, {
    as: "pao_has_tests",
    foreignKey: "test_id",
  });
  test_component.belongsTo(test, { as: "test", foreignKey: "test_id" });
  test.hasMany(test_component, {
    as: "components",
    foreignKey: "test_id",
  });
  tgc_category.belongsTo(test_group, { as: "test_group", foreignKey: "test_group_id", onDelete: "CASCADE" });
  test_group.hasMany(tgc_category, { as: "tgc_categories", foreignKey: "test_group_id", onDelete: "CASCADE" });
  tg_component.belongsTo(test_group, { as: "test_group", foreignKey: "test_group_id", onDelete: "CASCADE" });
  test_group.hasMany(tg_component, { as: "tg_components", foreignKey: "test_group_id", onDelete: "CASCADE" });
  tg_fields.belongsTo(test_group, { as: "test_group", foreignKey: "test_group_id", onDelete: "CASCADE" });
  test_group.hasMany(tg_fields, { as: "tg_fields", foreignKey: "test_group_id", onDelete: "CASCADE" });
  field_comp_options.belongsTo(test_group, { as: "test_group", foreignKey: "test_group_id", onDelete: "CASCADE" });
  test_group.hasMany(field_comp_options, { as: "field_comp_options", foreignKey: "test_group_id", onDelete: "CASCADE" });
  // Note: medical_report_tg_field_value associations removed - migrated to test_group_result
  medical_report_has_tg.belongsTo(medical_report, {
    as: "medical_report",
    foreignKey: "medical_report_id",
  });
  medical_report.hasMany(medical_report_has_tg, {
    as: "medical_report_has_tgs",
    foreignKey: "medical_report_id",
  });
  // Note: medical_report_tg_field_value test_group associations removed - migrated to test_group_result
  medical_report_has_tg.belongsTo(test_group, { as: "test_group", foreignKey: "test_group_id", onDelete: "CASCADE" });
  test_group.hasMany(medical_report_has_tg, { as: "medical_report_has_tgs", foreignKey: "test_group_id", onDelete: "CASCADE" });
  
  tg_component.belongsTo(tgc_category, { as: "category", foreignKey: "test_category_id" });
  tgc_category.hasMany(tg_component, { as: "tg_components", foreignKey: "test_category_id" });
  // Note: medical_report_tg_field_value tg_fields association removed - migrated to test_group_result
medical_report_test_component_result.belongsTo(test_component, {
  as: "test_component_results",

  foreignKey: "test_component_id"
});
test_component.hasMany(medical_report_test_component_result, {
  as: "component_results",
  foreignKey: "test_component_id"
});

// Note: All medical_report_tg_field_value associations removed - migrated to test_group_result
// The new test_group_result table stores field values in JSON format
  // Antibiotic sensitivity associations
  medical_report_has_culture_antibiotic.belongsTo(medical_report_has_culture, {
    as: "medical_report_has_culture",
    foreignKey: "medical_report_has_culture_id",
  });
  medical_report_has_culture.hasMany(medical_report_has_culture_antibiotic, {
    as: "culture_antibiotics",
    foreignKey: "medical_report_has_culture_id",
  });
  medical_report_has_culture_antibiotic.belongsTo(antibiotic, {
    as: "antibiotic",
    foreignKey: "antibiotic_id",
  });
  antibiotic.hasMany(medical_report_has_culture_antibiotic, {
    as: "culture_antibiotics",
    foreignKey: "antibiotic_id",
  });

  // Culture result associations
  medical_report_culture_result.belongsTo(medical_report_has_culture, {
    as: "medical_report_has_culture",
    foreignKey: "medical_report_has_culture_id",
  });
  medical_report_has_culture.hasMany(medical_report_culture_result, {
    as: "culture_results",
    foreignKey: "medical_report_has_culture_id",
  });

  // Tenant associations
  lab.hasMany(patient, { as: "patients", foreignKey: "lab_id" });
  patient.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  lab.hasMany(branch, { as: "branches", foreignKey: "lab_id" });
  branch.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  lab.hasMany(bill, { as: "bills", foreignKey: "lab_id" });
  bill.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  lab.hasMany(medical_report, { as: "medical_reports", foreignKey: "lab_id" });
  medical_report.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  lab.hasMany(lab_settings, { as: "settings", foreignKey: "lab_id" });
  lab_settings.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  lab.hasMany(lab_activity_log, { as: "activity_logs", foreignKey: "lab_id" });
  lab_activity_log.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  patient.belongsTo(branch, { as: "branch", foreignKey: "branch_id" });
  branch.hasMany(patient, { as: "patients", foreignKey: "branch_id" });

  // Multi-tenant associations (removed duplicate 'lab' alias definitions to avoid conflicts)
  //  NOTE: Associations for lab_settings and lab_activity_log with alias 'lab' are defined above.

  // Lab associations for tenant isolation (use unique aliases)
  patient.belongsTo(lab, { as: "patient_lab", foreignKey: "lab_id" });
  bill.belongsTo(lab, { as: "bill_lab", foreignKey: "lab_id" });
  medical_report.belongsTo(lab, { as: "medical_report_lab", foreignKey: "lab_id" });

  bill.belongsTo(branch, { as: "branch", foreignKey: "branch_id" });
  branch.hasMany(bill, { as: "bills", foreignKey: "branch_id" });

  medical_report.belongsTo(branch, { as: "branch", foreignKey: "branch_id" });
  branch.hasMany(medical_report, { as: "medical_reports", foreignKey: "branch_id" });

  // Only one 'lab' alias for employee
  employee.belongsTo(lab, { as: 'lab', foreignKey: 'lab_id' });
  lab.hasMany(employee, { as: 'employees', foreignKey: 'lab_id' });

  contract.belongsTo(lab, { as: "contract_lab", foreignKey: "lab_id" });
  lab.hasMany(contract, { as: "contracts", foreignKey: "lab_id" });

  packages_and_offers.belongsTo(lab, { as: "packages_lab", foreignKey: "lab_id" });
  lab.hasMany(packages_and_offers, { as: "packages", foreignKey: "lab_id" });

  payment_method.belongsTo(lab, { as: "payment_method_lab", foreignKey: "lab_id" });
  lab.hasMany(payment_method, { as: "payment_methods", foreignKey: "lab_id" });

  company.belongsTo(lab, { as: "company_lab", foreignKey: "lab_id" });
  lab.hasMany(company, { as: "companies", foreignKey: "lab_id" });

  doctor.belongsTo(lab, { as: "doctor_lab", foreignKey: "lab_id" });
  lab.hasMany(doctor, { as: "doctors", foreignKey: "lab_id" });

chemist.belongsTo(lab, { as: "chemist_lab", foreignKey: "lab_id" });
lab.hasMany(chemist, { as: "chemists", foreignKey: "lab_id" });

  // Inventory & Stock Management Associations
  supplier.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(supplier, { as: "suppliers", foreignKey: "lab_id" });

  inventory_item.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(inventory_item, { as: "inventory_items", foreignKey: "lab_id" });

  inventory_batch.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(inventory_batch, { as: "inventory_batches", foreignKey: "lab_id" });

  inventory_transaction.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(inventory_transaction, { as: "inventory_transactions", foreignKey: "lab_id" });

  inventory_batch.belongsTo(supplier, { as: "supplier", foreignKey: "supplier_id" });
  supplier.hasMany(inventory_batch, { as: "batches", foreignKey: "supplier_id" });

  inventory_batch.belongsTo(inventory_item, { as: "item", foreignKey: "item_id" });
  inventory_item.hasMany(inventory_batch, { as: "batches", foreignKey: "item_id" });

  inventory_transaction.belongsTo(inventory_item, { as: "item", foreignKey: "item_id" });
  inventory_item.hasMany(inventory_transaction, { as: "transactions", foreignKey: "item_id" });

  inventory_transaction.belongsTo(inventory_batch, { as: "batch", foreignKey: "batch_id" });
  inventory_batch.hasMany(inventory_transaction, { as: "transactions", foreignKey: "batch_id" });

  inventory_transaction.belongsTo(employee, { as: "employee", foreignKey: "employee_id" });
  employee.hasMany(inventory_transaction, { as: "inventory_transactions", foreignKey: "employee_id" });
  
  // Inventory Notifications
  inventory_notification.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(inventory_notification, { as: "inventory_notifications", foreignKey: "lab_id" });

  inventory_notification.belongsTo(inventory_item, { as: "item", foreignKey: "item_id" });
  inventory_item.hasMany(inventory_notification, { as: "notifications", foreignKey: "item_id" });

  inventory_notification.belongsTo(inventory_batch, { as: "batch", foreignKey: "batch_id" });
  inventory_batch.hasMany(inventory_notification, { as: "notifications", foreignKey: "batch_id" });

  // Lab Payment relationships
  lab_payment.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(lab_payment, { as: "payments", foreignKey: "lab_id" });

// Define associations for the new models
culture.belongsToMany(culture_option, {
  as: "options",
  through: culture_has_option,
  foreignKey: "culture_id",
  otherKey: "culture_option_id"
});

culture_option.belongsToMany(culture, {
  as: "cultures",
  through: culture_has_option,
  foreignKey: "culture_option_id",
  otherKey: "culture_id"
});

culture_option.hasMany(culture_sub_option, {
  as: "subOptions",
  foreignKey: "culture_option_id"
});

culture_sub_option.belongsTo(culture_option, {
  as: "option",
  foreignKey: "culture_option_id"
});

// Associations for medical_report_test_component_result
medical_report_test_component_result.belongsTo(medical_report, {
  as: "medical_report",
  foreignKey: "medical_report_id"
});
medical_report.hasMany(medical_report_test_component_result, {
  as: "test_component_results",
  foreignKey: "medical_report_id"
});

medical_report_test_component_result.belongsTo(test, {
  as: "test",
  foreignKey: "test_id"
});
test.hasMany(medical_report_test_component_result, {
  as: "component_results",
  foreignKey: "test_id"
});

medical_report_test_component_result.belongsTo(test_component, {
  as: "test_component",
  foreignKey: "test_component_id"
});
test_component.hasMany(medical_report_test_component_result, {
  as: "results",
  foreignKey: "test_component_id"
});

// Test Group Result associations
// Each test_group_result belongs to a medical_report
test_group_result.belongsTo(medical_report, {
  as: "medical_report",
  foreignKey: "medical_report_id"
});
medical_report.hasMany(test_group_result, {
  as: "test_group_results",
  foreignKey: "medical_report_id"
});

// Each test_group_result belongs to a test_group
test_group_result.belongsTo(test_group, {
  as: "test_group",
  foreignKey: "test_group_id"
});
test_group.hasMany(test_group_result, {
  as: "results",
  foreignKey: "test_group_id"
});

// Each test_group_result belongs to a tg_component
test_group_result.belongsTo(tg_component, {
  as: "tg_component",
  foreignKey: "tg_component_id"
});
tg_component.hasMany(test_group_result, {
  as: "results",
  foreignKey: "tg_component_id"
});

// Test Comments associations
test_comments.belongsTo(medical_report, {
  as: "medical_report",
  foreignKey: "medical_report_id"
});
medical_report.hasMany(test_comments, {
  as: "test_comments",
  foreignKey: "medical_report_id"
});

test_comments.belongsTo(test, {
  as: "test",
  foreignKey: "test_id"
});
test.hasMany(test_comments, {
  as: "comments",
  foreignKey: "test_id"
});

// Test Group Comments associations
test_group_comments.belongsTo(medical_report, {
  as: "medical_report",
  foreignKey: "medical_report_id"
});
medical_report.hasMany(test_group_comments, {
  as: "test_group_comments",
  foreignKey: "medical_report_id"
});

test_group_comments.belongsTo(test_group, {
  as: "test_group",
  foreignKey: "test_group_id"
});
test_group.hasMany(test_group_comments, {
  as: "comments",
  foreignKey: "test_group_id"
});

// Comment Images associations (polymorphic)
// Note: These are handled programmatically since Sequelize doesn't support true polymorphic associations
// Images will be queried based on comment_type and comment_id

return {
  admin,
  admin_packages_and_offers,
  antibiotic,
  bill,
  bill_has_culture,
  bill_has_package,
  bill_has_payment_method,
  bill_has_tg,
  bill_has_test,
  branch,
  branch_has_employee,
  categories_test_and_culture,
  chemist,
  company,
  contract,
  contract_has_culture,
  contract_has_test,
  culture,
  culture_has_option,
  culture_option,
  culture_sub_option,
  diseases,
  doctor,
  employee,
  field_comp_options,
  lab,
  lab_activity_log,
  lab_contracts_company,
  lab_contracts_doctor,
  lab_settings,
  medical_report,
  medical_report_has_culture,
  medical_report_has_culture_antibiotic,
  medical_report_culture_result,
  medical_report_has_test,
  medical_report_test_component_result,
  medical_report_has_tg,
    // medical_report_tg_field_value, // Removed - migrated to test_group_result
    packages_and_offers,
  pao_has_culture,
  pao_has_test,
  patient,
  patient_has_diseases,
  payment_method,
  phone,
  question,
  receptionist,
  referral,
  sample_type,
  status,
  subscription,
  lab_payment,
  test,
  test_component,
  test_group,
  test_has_question,
  tg_component,
  tg_fields,
  tgc_category,
  test_group_result,
  test_comments,
  test_group_comments,
  comment_images,
  supplier,
  inventory_item,
  inventory_batch,
  inventory_transaction,
  inventory_notification,
};
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;

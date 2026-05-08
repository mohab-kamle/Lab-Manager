var DataTypes = require("sequelize").DataTypes;
var _admin = require("./admin");
var _admin_packages_and_offers = require("./admin_packages_and_offers");
var _antibiotic = require("./antibiotic");
var _bill = require("./bill");

var _bill_has_payment_method = require("./bill_has_payment_method");
var _bill_has_test = require("./bill_has_test");
var _bill_has_package = require("./bill_has_package");
var _branch = require("./branch");
var _branch_has_employee = require("./branch_has_employee");
var _categories_test_and_culture = require("./categories_test_and_culture");
var _chemist = require("./chemist");
var _company = require("./company");
var _contract = require("./contract");

var _contract_has_test = require("./contract_has_test");


var _diseases = require("./diseases");
var _doctor = require("./doctor");
var _employee = require("./employee");
var _lab = require("./lab");
var _lab_contracts_company = require("./lab_contracts_company");
var _lab_settings = require("./lab_settings");
var _lab_activity_log = require("./lab_activity_log");
var _medical_report = require("./medical_report");
var _medical_report_has_test = require("./medical_report_has_test");
var _medical_report_results = require("./medical_report_results");
var _lab_samples = require("./lab_samples");

var _packages_and_offers = require("./packages_and_offers");

var _pao_has_test = require("./pao_has_test");
var _patient = require("./patient");
var _patient_has_diseases = require("./patient_has_diseases");
var _payment_method = require("./payment_method");
var _phone_number = require("./phone_number");
var _question = require("./question");
var _receptionist = require("./receptionist");
var _sample_type = require("./sample_type");
var _status = require("./status");
var _global_test_catalog = require("./global_test_catalog");
var _test = require("./test");
var _test_has_question = require("./test_has_question");






var _lab_payment = require("./lab_payment");
var _subscription = require("./subscription");
var _test_comments = require("./test_comments");
var _comment_images = require("./comment_images");
var _supplier = require("./supplier");
var _inventory_item = require("./inventory_item");
var _inventory_batch = require("./inventory_batch");
var _inventory_transaction = require("./inventory_transaction");
var _inventory_notification = require("./inventory_notification");
var _lab_whatsapp_account = require("./lab_whatsapp_account");
var _whatsapp_message = require("./whatsapp_message");
var _outsourced_lab = require("./outsourced_lab");

function initModels(sequelize) {
  var admin = _admin(sequelize, DataTypes);
  var admin_packages_and_offers = _admin_packages_and_offers(sequelize, DataTypes);
  var antibiotic = _antibiotic(sequelize, DataTypes);
  var bill = _bill(sequelize, DataTypes);
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
  var contract_has_test = _contract_has_test(sequelize, DataTypes);
  var diseases = _diseases(sequelize, DataTypes);
  var doctor = _doctor(sequelize, DataTypes);
  var employee = _employee(sequelize, DataTypes);
  var lab = _lab(sequelize, DataTypes);
  var lab_contracts_company = _lab_contracts_company(sequelize, DataTypes);
  var lab_settings = _lab_settings(sequelize, DataTypes);
  var lab_activity_log = _lab_activity_log(sequelize, DataTypes);
  var lab_payment = _lab_payment(sequelize, DataTypes);
  var medical_report = _medical_report(sequelize, DataTypes);
  var medical_report_has_test = _medical_report_has_test(sequelize, DataTypes);
  var medical_report_results = _medical_report_results(sequelize, DataTypes);
  var lab_samples = _lab_samples(sequelize, DataTypes);
  var packages_and_offers = _packages_and_offers(sequelize, DataTypes);
  var pao_has_test = _pao_has_test(
    sequelize,
    DataTypes
  );
  var patient = _patient(sequelize, DataTypes);
  var patient_has_diseases = _patient_has_diseases(sequelize, DataTypes);
  var payment_method = _payment_method(sequelize, DataTypes);
  var phone_number = _phone_number(sequelize, DataTypes);
  var question = _question(sequelize, DataTypes);
  var receptionist = _receptionist(sequelize, DataTypes);
  var sample_type = _sample_type(sequelize, DataTypes);
  var status = _status(sequelize, DataTypes);
  var global_test_catalog = _global_test_catalog(sequelize, DataTypes);
  var test = _test(sequelize, DataTypes);
  var test_has_question = _test_has_question(sequelize, DataTypes);
  var subscription = _subscription(sequelize, DataTypes);
  var test_comments = _test_comments(sequelize, DataTypes);
  var comment_images = _comment_images(sequelize, DataTypes);
  var supplier = _supplier(sequelize, DataTypes);
  var inventory_item = _inventory_item(sequelize, DataTypes);
  var inventory_batch = _inventory_batch(sequelize, DataTypes);
  var inventory_transaction = _inventory_transaction(sequelize, DataTypes);
  var inventory_notification = _inventory_notification(sequelize, DataTypes);
  var lab_whatsapp_account = _lab_whatsapp_account(sequelize, DataTypes);
  var whatsapp_message = _whatsapp_message(sequelize, DataTypes);
  var outsourced_lab = _outsourced_lab(sequelize, DataTypes);

  // ── Inventory associations ──────────────────────────────────────────────
  // inventory_item ↔ inventory_batch (one item has many batches)
  inventory_item.hasMany(inventory_batch, { as: "batches", foreignKey: "item_id" });
  inventory_batch.belongsTo(inventory_item, { as: "item", foreignKey: "item_id" });

  // inventory_item ↔ inventory_transaction
  inventory_item.hasMany(inventory_transaction, { as: "transactions", foreignKey: "item_id" });
  inventory_transaction.belongsTo(inventory_item, { as: "item", foreignKey: "item_id" });

  // inventory_batch ↔ inventory_transaction
  inventory_batch.hasMany(inventory_transaction, { as: "transactions", foreignKey: "batch_id" });
  inventory_transaction.belongsTo(inventory_batch, { as: "batch", foreignKey: "batch_id" });

  // inventory_notification ↔ inventory_item
  inventory_notification.belongsTo(inventory_item, { as: "item", foreignKey: "item_id" });
  inventory_item.hasMany(inventory_notification, { as: "notifications", foreignKey: "item_id" });

  // inventory_notification ↔ inventory_batch
  inventory_notification.belongsTo(inventory_batch, { as: "batch", foreignKey: "batch_id" });
  inventory_batch.hasMany(inventory_notification, { as: "notifications", foreignKey: "batch_id" });

  // supplier ↔ inventory_batch
  supplier.hasMany(inventory_batch, { as: "batches", foreignKey: "supplier_id" });
  inventory_batch.belongsTo(supplier, { as: "supplier", foreignKey: "supplier_id" });

  // employee ↔ inventory_transaction
  inventory_transaction.belongsTo(employee, { as: "employee", foreignKey: "employee_id" });
  employee.hasMany(inventory_transaction, { as: "inventory_transactions", foreignKey: "employee_id" });

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

  // Add association between bill and doctor
  bill.belongsTo(doctor, { as: "referred_doctor", foreignKey: "referred_doctor_id" });
  doctor.hasMany(bill, { as: "referred_bills", foreignKey: "referred_doctor_id" });

  // Add association between doctor and contract
  doctor.belongsTo(contract, { as: "contract", foreignKey: "contract_id" });
  contract.hasMany(doctor, { as: "doctors", foreignKey: "contract_id" });

  admin.belongsToMany(packages_and_offers, {
    as: "package_id_packages_and_offers",
    through: admin_packages_and_offers,
    foreignKey: "admin_id",
    otherKey: "package_and_offer_id",
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
  contract.belongsToMany(test, {
    as: "test_id_test_contract_has_tests",
    through: contract_has_test,
    foreignKey: "contract_id",
    otherKey: "test_id",
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
  packages_and_offers.belongsToMany(admin, {
    as: "admin_id_admins",
    through: admin_packages_and_offers,
    foreignKey: "package_and_offer_id",
    otherKey: "admin_id",
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
  test.belongsTo(contract, { as: "contract", foreignKey: "contract_id" });
  contract.hasMany(test, { as: "tests", foreignKey: "contract_id" });
  test.belongsTo(global_test_catalog, { as: "global_test", foreignKey: "global_test_id", constraints: false });
  global_test_catalog.hasMany(test, { as: "tests", foreignKey: "global_test_id", constraints: false });
  patient_has_diseases.belongsTo(diseases, {
    as: "disease",
    foreignKey: "diseases_id",
  });
  diseases.hasMany(patient_has_diseases, {
    as: "patient_has_diseases",
    foreignKey: "diseases_id",
  });
  admin.belongsTo(employee, { as: "id_employee", foreignKey: "id" });
  employee.hasOne(admin, { as: "admin", foreignKey: "id" });
  chemist.belongsTo(employee, { as: "id_employee", foreignKey: "id" });
  employee.hasOne(chemist, { as: "chemist", foreignKey: "id" });
  receptionist.belongsTo(employee, { as: "id_employee", foreignKey: "id" });
  employee.hasOne(receptionist, { as: "receptionist", foreignKey: "id" });
  branch.belongsTo(lab, { as: "branch_lab", foreignKey: "lab_id" });
  lab.hasMany(branch, { as: "lab_branches", foreignKey: "lab_id" });
  lab_contracts_company.belongsTo(lab, { as: "company_lab", foreignKey: "lab_id" });
  lab.hasMany(lab_contracts_company, { as: "lab_company_contracts", foreignKey: "lab_id" });
  medical_report_has_test.belongsTo(medical_report, {
    as: "medical_report",
    foreignKey: "medical_report_id",
  });
  medical_report.hasMany(medical_report_has_test, {
    as: "medical_report_has_tests",
    foreignKey: "medical_report_id",
  });
  admin_packages_and_offers.belongsTo(packages_and_offers, {
    as: "packages_and_offer",
    foreignKey: "package_and_offer_id",
  });
  packages_and_offers.hasMany(admin_packages_and_offers, {
    as: "admin_packages_and_offers",
    foreignKey: "package_and_offer_id",
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
  phone_number.belongsTo(patient, { as: "patient", foreignKey: "patient_id" });
  patient.hasMany(phone_number, { as: "phones", foreignKey: "patient_id" });
  phone_number.belongsTo(employee, { as: "employee", foreignKey: "employee_id" });
  employee.hasMany(phone_number, { as: "phones", foreignKey: "employee_id" });
  phone_number.belongsTo(doctor, { as: "doctor", foreignKey: "doctor_id" });
  doctor.hasMany(phone_number, { as: "phones", foreignKey: "doctor_id" });
  phone_number.belongsTo(supplier, { as: "supplier", foreignKey: "supplier_id" });
  supplier.hasMany(phone_number, { as: "phones", foreignKey: "supplier_id" });
  phone_number.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(phone_number, { as: "phones", foreignKey: "lab_id" });
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
  // Antibiotic sensitivity associations

  // Culture result associations

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

  test.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(test, { as: "tests", foreignKey: "lab_id" });

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

  lab.hasMany(outsourced_lab, { as: "outsourced_labs", foreignKey: "lab_id" });
  outsourced_lab.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });

  // Lab Payment relationships
  lab_payment.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(lab_payment, { as: "payments", foreignKey: "lab_id" });

  // Define associations for the new models
  lab_whatsapp_account.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasOne(lab_whatsapp_account, { as: "whatsapp_account", foreignKey: "lab_id" });

  whatsapp_message.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
  lab.hasMany(whatsapp_message, { as: "whatsapp_messages", foreignKey: "lab_id" });

  whatsapp_message.belongsTo(patient, { as: "patient", foreignKey: "patient_id" });
  patient.hasMany(whatsapp_message, { as: "whatsapp_messages", foreignKey: "patient_id" });

  // Test Group Result associations
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
  // Comment Images associations (polymorphic)
  // Note: These are handled programmatically since Sequelize doesn't support true polymorphic associations
  // Images will be queried based on comment_type and comment_id

  // medical_report_results associations
  medical_report_results.belongsTo(medical_report, {
    as: "medical_report",
    foreignKey: "medical_report_id"
  });
  medical_report.hasMany(medical_report_results, {
    as: "medical_report_results",
    foreignKey: "medical_report_id"
  });

  medical_report_results.belongsTo(test, {
    as: "test",
    foreignKey: "test_id"
  });
  test.hasMany(medical_report_results, {
    as: "medical_report_results",
    foreignKey: "test_id"
  });


  // manager_key associations
  manager_key.belongsTo(lab, { as: "lab", foreignKey: "lab_id"});
  lab.hasMany(manager_key, { as: "manager_keys", foreignKey: "lab_id"});

  manager_key.belongsTo(employee, { as: "admin", foreignKey: "admin_id"});
  employee.hasMany(manager_key, { as: "manager_keys", foreignKey: "admin_id"});

  // Financial Transactions belong to a Manager Key (optional)
  financial_transaction.belongsTo(manager_key, { as: "manager_key", foreignKey: "manager_key_id"});
  manager_key.hasMany(financial_transaction, { as: "financial_transactions", foreignKey: "manager_key_id"});


  // lab_samples associations
  lab_samples.belongsTo(medical_report, { as: "medical_report", foreignKey: "medical_report_id"});
  medical_report.hasMany(lab_samples, { as: "lab_samples", foreignKey: "medical_report_id"});

  lab_samples.belongsTo(test, { as: "test", foreignKey: "test_id"});
  test.hasMany(lab_samples, { as: "lab_samples", foreignKey: "test_id"});

  lab_samples.belongsTo(sample_type, { as: "sample_type", foreignKey: "sample_type_id"});
  sample_type.hasMany(lab_samples, { as: "lab_samples", foreignKey: "sample_type_id"});

  return {
    admin,
    admin_packages_and_offers,
    antibiotic,
    bill,
    bill_has_package,
    bill_has_payment_method,
    bill_has_test,
    branch,
    branch_has_employee,
    categories_test_and_culture,
    chemist,
    company,
    contract,
    contract_has_test,
    diseases,
    doctor,
    employee,
    lab,
    lab_activity_log,
    lab_contracts_company,
    lab_payment,
    lab_samples,
    lab_settings,
    medical_report,
    medical_report_has_test,
    medical_report_results,
    packages_and_offers,
    pao_has_test,
    patient,
    patient_has_diseases,
    payment_method,
    phone_number,
    question,
    receptionist,
    sample_type,
    status,
    subscription,

    global_test_catalog,
    test,
    test_has_question,
    test_comments,
    comment_images,
    supplier,
    inventory_item,
    inventory_batch,
    inventory_transaction,
    inventory_notification,
    lab_whatsapp_account,
    whatsapp_message,
    outsourced_lab
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;

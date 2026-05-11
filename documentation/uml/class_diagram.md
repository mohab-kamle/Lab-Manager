# Class Diagram: Lab-Manager System

This document provides a detailed explanation of the data structure and entity relationships within the Lab-Manager (Cura) system, followed by a breakdown of the system into five logical domains.

---

## Diagram

```mermaid
classDiagram
    class Lab {
        +int id
        +string name
        +string code
        +string subscription_status
    }

    class Branch {
        +int id
        +string name
        +string address
        +int manager_id
    }

    class Employee {
        +int id
        +string username
        +string email
        +string role
    }

    class Admin {
        +int id
    }

    class Chemist {
        +int id
    }

    class Receptionist {
        +int id
    }

    class Patient {
        +int id
        +string first_name
        +string last_name
        +string gender
        +date dob
    }

    class Doctor {
        +int id
        +string name
        +string specialization
    }

    class Bill {
        +int id
        +float total_amount
        +float paid_amount
        +string status
        +datetime created_at
    }

    class MedicalReport {
        +int id
        +string report_id
        +string status
        +datetime reported_at
    }

    class Test {
        +int id
        +string name
        +float price
        +string code
    }

    class Category {
        +int id
        +string name
    }

    class SampleType {
        +int id
        +string name
    }

    class InventoryItem {
        +int id
        +string name
        +int min_stock
    }

    class InventoryBatch {
        +int id
        +string batch_number
        +int quantity
        +date expiry_date
    }

    class Supplier {
        +int id
        +string name
        +string contact
    }

    %% Relationships
    Lab "1" -- "*" Branch : manages
    Lab "1" -- "*" Employee : employs
    Lab "1" -- "*" Patient : serves
    
    Branch "1" -- "*" Patient : registered_at
    Branch "1" -- "*" Bill : processes
    
    Employee <|-- Admin
    Employee <|-- Chemist
    Employee <|-- Receptionist
    
    Patient "1" -- "*" Bill : has
    Patient "1" -- "*" MedicalReport : receives
    
    Bill "1" -- "1" MedicalReport : generates
    Bill "*" -- "1" Receptionist : created_by
    Bill "*" -- "1" Doctor : referred_by
    
    MedicalReport "*" -- "*" Test : includes
    MedicalReport "*" -- "1" Chemist : signed_by
    
    Test "*" -- "1" Category : belongs_to
    Test "*" -- "1" SampleType : requires
    
    InventoryItem "1" -- "*" InventoryBatch : has
    InventoryBatch "*" -- "1" Supplier : provided_by
    InventoryItem "*" -- "*" Chemist : managed_by
```

---

## 1. Core Organizational Domain
This domain defines the multi-tenant structure of the software.
*   **Lab:** The root entity representing a laboratory organization. It holds global settings and subscription status. All other data is scoped to a Lab to ensure data isolation.
*   **Branch:** Labs can have multiple physical locations. A Branch manages its own subset of patients and staff, but remains under the parent Lab's umbrella.

## 2. User & Access Control Domain
The system uses a hierarchical and role-based approach to user management.
*   **Employee:** The base class for all staff members. It contains core identity data (username, email, role).
    *   **Admin:** Inherits from Employee. Has full managerial rights over branches and staff.
    *   **Chemist:** Inherits from Employee. Specialized in laboratory technical tasks.
    *   **Receptionist:** Inherits from Employee. Focused on patient onboarding and billing.
*   **Patient:** A separate entity representing the client. Linked to a specific Lab and Branch where they were first registered.
*   **Doctor:** Represents medical professionals who refer patients. They can be external or contracted with the lab.

## 3. Medical Operations Domain
The "heart" of the system where medical tests and results are defined.
*   **Test:** Represents a specific medical analysis (e.g., Blood Sugar, Liver Function). It includes pricing and technical configuration (structure_config).
*   **Category:** Groups tests for better organization (e.g., Biochemistry, Hematology).
*   **SampleType:** Defines what kind of specimen is needed for a test (e.g., Serum, Whole Blood, Urine).
*   **MedicalReport:** The primary document produced by the lab. It links a Patient and a Bill to a set of verified Test results.

## 4. Billing & Financial Domain
Manages the revenue lifecycle of the laboratory.
*   **Bill:** A financial transaction record. It captures the total amount, paid amount, and payment status.
*   **Bill_Has_Test / Bill_Has_Package:** Junction tables that track exactly which services were charged in a single bill.
*   **Status:** A lookup table for payment and operational statuses (e.g., Pending, Paid, Refunded).

## 5. Inventory Domain
Tracks the supplies needed to perform tests.
*   **InventoryItem:** Represents a reagent or consumable (e.g., Glucose Strips, Alcohol Swabs). It tracks "Min Stock" for automated alerts.
*   **InventoryBatch:** Specific shipments of items. Includes vital data like "Expiry Date" and "Batch Number" for quality control.
*   **Supplier:** Information about the vendors providing the inventory items.

---

## 6. Key Data Relationships

### One-to-Many Relationships
*   **Lab ↔ Branch:** One Lab can manage multiple physical locations.
*   **Patient ↔ Bill:** One Patient can have many bills over time.
*   **Branch ↔ Staff:** A Branch is managed by an Admin and staffed by multiple Chemists and Receptionists.

### Many-to-Many Relationships
*   **MedicalReport ↔ Test:** A single report can contain multiple test results, and a single type of test can appear in thousands of different reports.
*   **Bill ↔ Packages/Offers:** A bill can combine multiple discounted packages and individual tests.
*   **Patient ↔ Diseases:** Used for medical history tracking; a patient can have multiple chronic conditions, and a disease can affect multiple patients.

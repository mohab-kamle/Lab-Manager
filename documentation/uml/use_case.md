```mermaid
useCaseDiagram
    actor "Patient" as P
    actor "Receptionist" as R
    actor "Chemist" as C
    actor "Doctor" as D
    actor "Admin" as A
    actor "Employee" as E

    package "Authentication" {
        usecase "Login" as UC1
        usecase "Logout" as UC2
        usecase "Reset Password" as UC3
    }

    package "Patient Management" {
        usecase "Register Patient" as UC4
        usecase "Update Profile" as UC5
        usecase "View Medical History" as UC6
    }

    package "Medical Operations" {
        usecase "Request Test" as UC7
        usecase "Collect Sample" as UC8
        usecase "Enter Test Results" as UC9
        usecase "Sign & Verify Report" as UC10
        usecase "View/Download Report" as UC11
    }

    package "Billing & Finance" {
        usecase "Generate Invoice" as UC12
        usecase "Process Payment" as UC13
        usecase "Manage Packages & Offers" as UC14
        usecase "Manage Corporate Contracts" as UC15
    }

    package "Inventory Management" {
        usecase "Track Stock Levels" as UC16
        usecase "Manage Suppliers" as UC17
        usecase "Receive Inventory Batches" as UC18
    }

    package "System Administration" {
        usecase "Manage Branches" as UC19
        usecase "Manage Employees" as UC20
        usecase "View Analytics Dashboard" as UC21
        usecase "System Configuration" as UC22
    }

    %% Relationships
    E <|-- A
    E <|-- C
    E <|-- R

    E --> UC1
    E --> UC2
    P --> UC1
    P --> UC2
    P --> UC3

    P --> UC5
    P --> UC11

    R --> UC4
    R --> UC7
    R --> UC12
    R --> UC13

    C --> UC8
    C --> UC9
    C --> UC10
    C --> UC16
    C --> UC18

    D --> UC6
    D --> UC11

    A --> UC14
    A --> UC15
    A --> UC17
    A --> UC19
    A --> UC20
    A --> UC21
    A --> UC22
    A --> UC10
```

graph TD
P["Patient"]
R["Receptionist"]
C["Chemist"]
D["Doctor"]
A["Admin"]
E["Employee"]

    UC1["Login"]
    UC2["Logout"]
    UC3["Reset Password"]
    UC4["Register Patient"]
    UC5["Update Profile"]
    UC6["View Medical History"]
    UC7["Request Test"]
    UC8["Collect Sample"]
    UC9["Enter Test Results"]
    UC10["Sign & Verify Report"]
    UC11["View/Download Report"]
    UC12["Generate Invoice"]
    UC13["Process Payment"]
    UC14["Manage Packages & Offers"]
    UC15["Manage Corporate Contracts"]
    UC16["Track Stock Levels"]
    UC17["Manage Suppliers"]
    UC18["Receive Inventory Batches"]
    UC19["Manage Branches"]
    UC20["Manage Employees"]
    UC21["View Analytics Dashboard"]
    UC22["System Configuration"]

    E -->|s1| C
    E -->|-- A
    E <| R

    E --> UC1
    E --> UC2
    P --> UC1
    P --> UC2
    P --> UC3

    P --> UC5
    P --> UC11

    R --> UC4
    R --> UC7
    R --> UC12
    R --> UC13

    C --> UC8
    C --> UC9
    C --> UC10
    C --> UC16
    C --> UC18

    D --> UC6
    D --> UC11

    A --> UC14
    A --> UC15
    A --> UC17
    A --> UC19
    A --> UC20
    A --> UC21
    A --> UC22
    A --> UC10

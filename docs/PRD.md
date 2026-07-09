        |

# Product Requirements Document (PRD)

## Product Overview & Business Requirements

---

# 1. Document Information

| Field          | Value                                       |
| -------------- | ------------------------------------------- |
| Product Name   | Prepaid Wallet POS System                   |
| Product Type   | Internal Business Web Application           |
| Platform       | Web Application                             |
| Architecture   | Monolithic Full-Stack Next.js Application   |
| Frontend       | Next.js + React + TypeScript                |
| Backend        | Next.js API Routes                          |
| Database       | MongoDB                                     |
| Authentication | JWT Authentication                          |
| Target Users   | Businesses operating prepaid wallet systems |

---

# 2. Executive Summary

The **Prepaid Wallet POS System** is a centralized business application designed to manage customers, prepaid wallets, smart cards, product sales, inventory, and financial transactions within a controlled retail environment.

Unlike a conventional Point of Sale system that relies on cash or card payments at checkout, this application operates on a **prepaid wallet model**. Customers first load funds into their wallet, and purchases are deducted directly from the wallet balance.

The system integrates wallet management, inventory, billing, staff administration, and reporting into a single platform.

Its objective is to provide businesses with:

- Fast checkout
- Controlled spending
- Reduced cash handling
- Accurate inventory
- Complete transaction history
- Secure staff access
- Centralized reporting

---

# 3. Business Problem

Traditional POS systems face several operational challenges:

- Cash handling errors
- Slow payment processing
- Difficulty tracking prepaid balances
- Manual inventory adjustments
- Limited customer spending history
- Inconsistent transaction records

Organizations operating prepaid membership systems require:

- Wallet-based payments
- Card identification
- Member management
- Recharge functionality
- Stock management
- Transaction auditing
- Administrative reporting

The Prepaid Wallet POS System addresses these operational needs by providing an integrated solution.

---

# 4. Product Vision

To deliver a secure, scalable, and efficient prepaid wallet management platform that enables businesses to manage members, wallets, inventory, billing, and financial operations from a single application while maintaining complete transactional integrity.

---

# 5. Product Goals

### Primary Goals

- Digitize prepaid wallet operations
- Eliminate manual accounting
- Simplify member management
- Improve checkout speed
- Ensure accurate wallet balances
- Maintain inventory accuracy
- Provide complete audit trails

### Secondary Goals

- Reduce staff errors
- Improve reporting
- Enhance security
- Support future scalability
- Enable role-based access control

---

# 6. Target Users

## System Administrator

Responsible for overall system configuration.

Responsibilities include:

- Initial system setup
- Staff management
- Product management
- Inventory supervision
- Business reporting
- Security management

---

## Staff / Cashier

Responsible for daily operational activities.

Responsibilities include:

- Register members
- Recharge wallets
- Process purchases
- Perform debits
- View member information
- Manage billing

---

## Business Owner

Uses reports for operational oversight.

Responsibilities include:

- Monitor sales
- Review wallet balances
- Analyze inventory
- Review staff activity
- Track revenue

---

# 7. User Roles & Permissions

| Module           | Admin |  Staff  |
| ---------------- | :---: | :-----: |
| Dashboard        |  ✅   |   ✅    |
| Members          |  ✅   |   ✅    |
| Wallets          |  ✅   |   ✅    |
| Cards            |  ✅   |   ✅    |
| Billing          |  ✅   |   ✅    |
| Recharges        |  ✅   |   ✅    |
| Debits           |  ✅   |   ✅    |
| Products         |  ✅   | Limited |
| Stock            |  ✅   | Limited |
| Reports          |  ✅   |  View   |
| Staff Management |  ✅   |   ❌    |
| System Setup     |  ✅   |   ❌    |

---

# 8. Business Workflow

The application's operational lifecycle follows this sequence:

```text
System Setup
        │
        ▼
Create Admin
        │
        ▼
Login
        │
        ▼
Create Staff
        │
        ▼
Create Products
        │
        ▼
Add Stock
        │
        ▼
Register Member
        │
        ▼
Issue Card
        │
        ▼
Create Wallet
        │
        ▼
Recharge Wallet
        │
        ▼
Billing
        │
        ▼
Wallet Deduction
        │
        ▼
Stock Reduction
        │
        ▼
Transaction Recorded
        │
        ▼
Reports Generated
```

---

# 9. Functional Scope

The system consists of the following core modules:

### Authentication

Secure login and authorization using JWT.

---

### Dashboard

Provides operational insights, statistics, and quick access to business metrics.

---

### Staff Management

Enables administrators to:

- Create staff
- Edit staff
- Activate/deactivate accounts
- Reset passwords
- Manage access

---

### Member Management

Allows staff to:

- Register members
- Update profiles
- Search members
- Manage active/inactive status

---

### Card Management

Each member can be assigned a prepaid card used for wallet identification during transactions.

---

### Wallet Management

Maintains each member's prepaid balance.

Supports:

- Wallet creation
- Balance inquiry
- Balance updates
- Recharge integration
- Debit integration

---

### Recharge Management

Allows authorized staff to add funds to member wallets while maintaining transaction history.

---

### Debit Management

Supports manual deductions when required for operational adjustments or corrections.

---

### Product Management

Maintains product catalog including:

- Product information
- Pricing
- Availability
- Status

---

### Stock Management

Tracks inventory through controlled stock movements and adjustments.

---

### Billing

Core operational module responsible for:

- Product selection
- Bill creation
- Wallet deduction
- Inventory updates
- Transaction recording

---

### Reports

Provides business insights including:

- Sales reports
- Recharge reports
- Wallet activity
- Stock reports
- Transaction history

---

# 10. Key Business Principles

The application is built around several core principles:

### Wallet-first payments

All purchases are completed using prepaid wallet balances.

---

### Inventory consistency

Product inventory is updated only through controlled stock operations and successful billing.

---

### Financial traceability

Every recharge, debit, and purchase generates a transaction record.

---

### Controlled access

Only authenticated users with appropriate permissions can access protected modules.

---

### Auditability

Critical business events are recorded to support reporting and accountability.

---

# Authentication, Dashboard, Staff & Member Management

---

# 11. Authentication Module

## Purpose

The Authentication module is responsible for ensuring that only authorized users can access the application while protecting sensitive business operations such as wallet management, billing, stock updates, and reporting.

The system implements secure authentication using **JWT (JSON Web Tokens)** and enforces role-based authorization for protected resources.

---

# Business Objectives

- Prevent unauthorized access
- Secure sensitive business data
- Support multiple staff members
- Maintain session security
- Enable scalable role management

---

# Features

### User Login

The application allows registered users to authenticate using:

- Username/Email
- Password

Upon successful authentication:

- Credentials are verified
- Password hash is compared
- JWT token is generated
- User session begins
- Protected routes become accessible

---

### Logout

Logout invalidates the current session by removing the authentication token from the client.

Expected outcome:

- User returned to Login screen
- Protected routes become inaccessible

---

### Protected Routes

Every protected page requires:

- Valid JWT
- Active account
- Authorized role

Unauthenticated users are redirected to Login.

---

### Session Validation

Each request verifies:

- Token validity
- Token expiration
- User existence
- Account status

---

# First-Time System Setup

## Purpose

The application supports initial installation where no administrator exists.

During first launch:

- Administrator account is created
- Business information is initialized
- System becomes operational

---

## Workflow

```text
Application Starts
        │
        ▼
Database Connected
        │
        ▼
Check Existing Admin
        │
        ├───────────────┐
        │               │
       Yes             No
        │               │
        ▼               ▼
 Login Screen     Setup Wizard
                        │
                        ▼
Create Administrator
                        │
                        ▼
Setup Complete
                        │
                        ▼
Login
```

---

# Authentication Flow

```text
User Login
      │
      ▼
Validate Credentials
      │
      ▼
Compare Password
      │
      ▼
Generate JWT
      │
      ▼
Store Session
      │
      ▼
Access Protected Modules
```

---

# Functional Requirements

### FR-AUTH-001

System shall authenticate registered users.

---

### FR-AUTH-002

System shall reject invalid credentials.

---

### FR-AUTH-003

System shall hash passwords before storing.

---

### FR-AUTH-004

System shall generate JWT after successful login.

---

### FR-AUTH-005

System shall protect secured routes.

---

### FR-AUTH-006

System shall prevent inactive users from logging in.

---

### FR-AUTH-007

System shall support administrator and staff roles.

---

# Validation Rules

| Field    | Validation                  |
| -------- | --------------------------- |
| Username | Required                    |
| Password | Required                    |
| Password | Encrypted                   |
| JWT      | Required for protected APIs |

---

# Acceptance Criteria

✔ User logs in successfully

✔ Invalid password rejected

✔ Expired token denied

✔ Unauthorized API blocked

✔ Protected pages inaccessible without login

---

# 12. Dashboard Module

---

## Purpose

The Dashboard serves as the operational control center of the application.

It provides administrators and staff with a high-level overview of business activity.

---

## Business Objectives

- Improve operational awareness
- Reduce navigation time
- Highlight business metrics
- Provide quick access to important modules

---

# Dashboard Components

The dashboard presents summarized business information including:

- Member statistics
- Wallet statistics
- Sales overview
- Product information
- Inventory status
- Recent transactions
- Quick navigation

---

# Expected KPIs

Examples include:

- Total Members
- Active Members
- Wallet Balance Summary
- Today's Sales
- Recharge Total
- Product Count
- Stock Count
- Transaction Count

---

# Dashboard Workflow

```text
User Login
      │
      ▼
Load Dashboard
      │
      ▼
Fetch Statistics
      │
      ▼
Display Summary Cards
      │
      ▼
Quick Navigation
```

---

# Functional Requirements

### FR-DASH-001

Dashboard shall load after successful login.

---

### FR-DASH-002

Dashboard shall display summarized business metrics.

---

### FR-DASH-003

Dashboard shall refresh latest information.

---

### FR-DASH-004

Dashboard shall provide shortcuts to modules.

---

# Acceptance Criteria

✔ Dashboard loads under 3 seconds

✔ Statistics displayed correctly

✔ Unauthorized users cannot access

---

# 13. Staff Management Module

---

## Purpose

The Staff Management module enables administrators to manage employees who operate the POS system.

Administrators maintain complete control over staff lifecycle.

---

# Business Objectives

- Centralized employee management
- Controlled permissions
- Secure account administration
- Operational accountability

---

# Staff Lifecycle

```text
Create Staff
      │
      ▼
Assign Role
      │
      ▼
Activate Account
      │
      ▼
Staff Login
      │
      ▼
Daily Operations
      │
      ▼
Deactivate (if required)
```

---

# Features

## Create Staff

Administrator can register staff members.

Information includes:

- Name
- Username
- Password
- Role
- Contact Information
- Status

---

## Edit Staff

Administrator can modify:

- Name
- Contact Details
- Role
- Status

---

## Activate/Deactivate

Staff accounts may be:

- Active
- Disabled

Disabled users cannot log in.

---

## Password Reset

Administrator may reset staff credentials.

---

## Search Staff

Supports quick lookup using:

- Name
- Username

---

# Functional Requirements

### FR-STAFF-001

Create new staff accounts.

---

### FR-STAFF-002

Edit existing staff.

---

### FR-STAFF-003

Deactivate staff.

---

### FR-STAFF-004

Reset passwords.

---

### FR-STAFF-005

Search staff.

---

### FR-STAFF-006

View staff list.

---

# Validation Rules

| Field    | Rule            |
| -------- | --------------- |
| Name     | Required        |
| Username | Unique          |
| Password | Required        |
| Role     | Required        |
| Status   | Active/Inactive |

---

# Business Rules

### BR-STAFF-001

Only administrators may manage staff.

---

### BR-STAFF-002

Username must be unique.

---

### BR-STAFF-003

Passwords must never be stored in plain text.

---

### BR-STAFF-004

Inactive staff cannot authenticate.

---

# Acceptance Criteria

✔ Staff created successfully

✔ Duplicate usernames rejected

✔ Password encrypted

✔ Disabled staff denied login

---

# 14. Member Management Module

---

## Purpose

Members are the primary customers of the prepaid wallet ecosystem.

Every purchase, recharge, wallet transaction, and card association revolves around a registered member.

---

# Business Objectives

- Maintain centralized customer records
- Support wallet ownership
- Enable card assignment
- Track transaction history

---

# Member Lifecycle

```text
Register Member
        │
        ▼
Generate Member Record
        │
        ▼
Assign Card
        │
        ▼
Create Wallet
        │
        ▼
Recharge Wallet
        │
        ▼
Billing
        │
        ▼
Transaction History
```

---

# Features

## Register Member

Capture member details including:

- Full Name
- Mobile Number
- Address
- Identification
- Status

---

## View Member

Display complete profile including:

- Personal Information
- Wallet Balance
- Assigned Card
- Recent Transactions

---

## Edit Member

Modify member information without affecting wallet history.

---

## Search Members

Search using:

- Name
- Mobile Number
- Member ID

---

## Member Status

Members may be:

- Active
- Inactive

Inactive members cannot perform wallet operations.

---

# Functional Requirements

### FR-MEMBER-001

Register members.

---

### FR-MEMBER-002

Search members.

---

### FR-MEMBER-003

Update member profile.

---

### FR-MEMBER-004

View member details.

---

### FR-MEMBER-005

Deactivate members.

---

# Business Rules

### BR-MEMBER-001

Each member represents one customer.

---

### BR-MEMBER-002

Member profile must exist before wallet creation.

---

### BR-MEMBER-003

Member must exist before card assignment.

---

### BR-MEMBER-004

Inactive members cannot perform billing.

---

# Validation Rules

| Field  | Validation           |
| ------ | -------------------- |
| Name   | Required             |
| Mobile | Required             |
| Mobile | Unique (recommended) |
| Status | Active/Inactive      |

---

# Acceptance Criteria

✔ Member registration successful

✔ Duplicate member validation enforced where applicable

✔ Member searchable instantly

✔ Member updates reflected immediately

✔ Inactive members restricted from transactions

---

# Module Relationships

```text
Authentication
        │
        ▼
Dashboard
        │
        ▼
Staff
        │
        ▼
Members
        │
        ▼
Cards
        │
        ▼
Wallets
```

---

# Card Management, Wallet Management, Recharge, Debit & Transactions

---

# 15. Card Management Module

## Purpose

The Card Management module enables the business to issue and manage physical or virtual prepaid cards that uniquely identify members during wallet transactions. Cards act as the primary identification medium for wallet access, allowing members to perform purchases without repeatedly entering personal information.

---

## Business Objectives

- Provide a unique identity for each member.
- Simplify POS billing.
- Reduce manual member lookup.
- Prevent duplicate card assignments.
- Support secure card lifecycle management.

---

## Features

### Card Issuance

Administrators or authorized staff can issue a new prepaid card to a registered member.

Each card receives:

- Unique Card Number
- Member Association
- Card Status
- Issue Date

---

### Card Assignment

Cards can only be assigned to an existing member.

Once assigned:

- Card becomes linked to the member's wallet.
- Billing operations can identify the member through the card.

---

### Card Replacement

If a card is lost or damaged:

- Existing card is deactivated.
- Replacement card is issued.
- Wallet remains unchanged.
- Transaction history remains intact.

---

### Card Status Management

Supported statuses:

- Active
- Inactive
- Lost
- Blocked
- Replaced

Only active cards may participate in billing.

---

## Card Lifecycle

```text
Create Card
      │
      ▼
Assign to Member
      │
      ▼
Activate Card
      │
      ▼
Use for Billing
      │
      ▼
Replace / Block / Deactivate
```

---

## Functional Requirements

### FR-CARD-001

System shall create unique cards.

### FR-CARD-002

System shall assign one card to one member.

### FR-CARD-003

System shall prevent duplicate active card assignments.

### FR-CARD-004

System shall allow card replacement.

### FR-CARD-005

System shall maintain card history.

---

## Business Rules

### BR-CARD-001

A card cannot exist without a member.

---

### BR-CARD-002

Only active cards can be used.

---

### BR-CARD-003

Blocked cards cannot perform transactions.

---

### BR-CARD-004

Replacing a card must not affect wallet balance.

---

## Acceptance Criteria

✔ Card successfully created

✔ Duplicate cards rejected

✔ Blocked cards denied

✔ Replacement retains wallet

---

# 16. Wallet Management Module

## Purpose

The Wallet module serves as the financial account for every registered member. All monetary operations—including recharges, purchases, and manual debits—are performed through the wallet.

It represents the financial core of the application.

---

## Business Objectives

- Maintain accurate balances.
- Ensure financial consistency.
- Support prepaid transactions.
- Maintain complete audit history.

---

## Wallet Features

### Wallet Creation

A wallet is created for every eligible member.

Wallet contains:

- Wallet ID
- Current Balance
- Member Association
- Status
- Transaction History

---

### Balance Inquiry

Users can view:

- Current Balance
- Available Funds
- Last Recharge
- Recent Transactions

---

### Balance Updates

Wallet balance changes through:

- Recharge
- Billing
- Manual Debit
- Administrative Adjustment (if permitted)

---

## Wallet Lifecycle

```text
Create Wallet
       │
       ▼
Recharge Wallet
       │
       ▼
Purchase Products
       │
       ▼
Balance Reduced
       │
       ▼
Transaction Recorded
```

---

## Functional Requirements

### FR-WALLET-001

Create wallet for member.

### FR-WALLET-002

Maintain wallet balance.

### FR-WALLET-003

Prevent negative balances.

### FR-WALLET-004

Display wallet history.

### FR-WALLET-005

Update balance atomically.

---

## Business Rules

### BR-WALLET-001

One wallet belongs to one member.

---

### BR-WALLET-002

Wallet balance can never become negative.

---

### BR-WALLET-003

Every balance modification creates a transaction.

---

### BR-WALLET-004

Billing must reduce wallet balance immediately after successful purchase.

---

## Acceptance Criteria

✔ Wallet created

✔ Balance displayed correctly

✔ Negative balance prevented

✔ History maintained

---

# 17. Wallet Recharge Module

## Purpose

The Recharge module enables staff to add prepaid funds into member wallets.

---

## Business Objectives

- Increase wallet balance.
- Maintain recharge records.
- Support quick wallet funding.

---

## Recharge Workflow

```text
Search Member
      │
      ▼
Select Wallet
      │
      ▼
Enter Recharge Amount
      │
      ▼
Validate Input
      │
      ▼
Update Wallet
      │
      ▼
Record Transaction
```

---

## Features

- Recharge wallet
- Recharge history
- Recharge search
- Recharge receipt
- Transaction recording

---

## Functional Requirements

### FR-RECHARGE-001

Accept recharge amount.

### FR-RECHARGE-002

Increase wallet balance.

### FR-RECHARGE-003

Record recharge transaction.

### FR-RECHARGE-004

Display updated balance.

---

## Validation Rules

| Field  | Validation     |
| ------ | -------------- |
| Amount | Required       |
| Amount | Greater than 0 |
| Wallet | Must exist     |
| Member | Must exist     |

---

## Business Rules

### BR-RECHARGE-001

Recharge amount must be positive.

---

### BR-RECHARGE-002

Recharge immediately increases wallet balance.

---

### BR-RECHARGE-003

Every recharge generates a transaction entry.

---

## Acceptance Criteria

✔ Wallet updated

✔ Recharge history stored

✔ Balance reflects recharge

---

# 18. Wallet Debit Module

## Purpose

The Debit module allows authorized personnel to manually deduct funds from a wallet for approved operational reasons, such as corrections or service charges.

---

## Business Objectives

- Support administrative deductions.
- Maintain financial integrity.
- Record all manual debits.

---

## Debit Workflow

```text
Search Member
      │
      ▼
Open Wallet
      │
      ▼
Enter Debit Amount
      │
      ▼
Validate Balance
      │
      ▼
Deduct Balance
      │
      ▼
Store Transaction
```

---

## Features

- Manual debit
- Debit history
- Reason capture
- Balance validation

---

## Functional Requirements

### FR-DEBIT-001

Accept debit amount.

### FR-DEBIT-002

Validate sufficient balance.

### FR-DEBIT-003

Reduce wallet balance.

### FR-DEBIT-004

Record debit transaction.

---

## Business Rules

### BR-DEBIT-001

Debit amount cannot exceed available balance.

---

### BR-DEBIT-002

Negative balances are prohibited.

---

### BR-DEBIT-003

Every debit requires a transaction record.

---

### BR-DEBIT-004

Only authorized staff may perform manual debits.

---

## Acceptance Criteria

✔ Debit successful

✔ Balance updated

✔ Insufficient balance rejected

✔ Transaction stored

---

# 19. Transaction Management Module

## Purpose

The Transaction module provides a complete audit trail of all financial activities performed within the system.

It ensures transparency, traceability, and accountability for every wallet operation.

---

## Transaction Types

The system records transactions generated from:

- Wallet Recharge
- Billing
- Manual Debit
- Wallet Adjustments (if permitted)

---

## Features

- Transaction history
- Transaction search
- Member-wise transactions
- Date filtering
- Financial audit

---

## Transaction Workflow

```text
Financial Operation
        │
        ▼
Validate Request
        │
        ▼
Update Wallet
        │
        ▼
Generate Transaction Record
        │
        ▼
Store Database Record
        │
        ▼
Display in History
```

---

## Functional Requirements

### FR-TRANS-001

Store every wallet transaction.

### FR-TRANS-002

Maintain chronological history.

### FR-TRANS-003

Allow transaction search.

### FR-TRANS-004

Display transaction details.

---

## Business Rules

### BR-TRANS-001

Transactions are immutable.

---

### BR-TRANS-002

Each transaction contains timestamp, amount, type, and related member.

---

### BR-TRANS-003

Transaction history cannot be deleted through standard application operations.

---

## Acceptance Criteria

✔ Every financial operation creates a transaction

✔ History is searchable

✔ Transaction records remain permanent

---

# Financial Workflow

```text
Member
   │
   ▼
Card Verification
   │
   ▼
Wallet Identified
   │
   ├──────────────┐
   │              │
Recharge      Billing
   │              │
   ▼              ▼
Balance +      Balance -
   │              │
   └──────┬───────┘
          ▼
Transaction Created
          │
          ▼
Reports Updated
```

---

# Product Management, Stock Management & Billing (POS)

---

# 20. Product Management Module

## Purpose

The Product Management module enables administrators to create, organize, and maintain the catalog of products available for purchase through the Prepaid Wallet POS System.

It serves as the foundation for inventory management and billing operations.

---

## Business Objectives

- Maintain a centralized product catalog.
- Ensure accurate product pricing.
- Support inventory tracking.
- Enable efficient billing.
- Prevent duplicate product records.

---

## Features

### Product Creation

Administrators can register new products by providing:

- Product Name
- Product Code / SKU
- Category
- Selling Price
- Unit of Measurement
- Status (Active/Inactive)

---

### Product Update

Authorized users can modify:

- Product Name
- Price
- Category
- Status

Historical transaction records remain unaffected by product updates.

---

### Product Search

Products can be searched using:

- Product Name
- Product Code
- Category

---

### Product Status Management

Supported statuses:

- Active
- Inactive

Inactive products cannot be added to new bills.

---

## Product Lifecycle

```text
Create Product
      │
      ▼
Add Stock
      │
      ▼
Available for Billing
      │
      ▼
Sold
      │
      ▼
Stock Updated
      │
      ▼
Deactivate (Optional)
```

---

## Functional Requirements

### FR-PRODUCT-001

System shall create new products.

---

### FR-PRODUCT-002

System shall edit product information.

---

### FR-PRODUCT-003

System shall search products.

---

### FR-PRODUCT-004

System shall activate/deactivate products.

---

### FR-PRODUCT-005

System shall display current product details.

---

## Validation Rules

| Field        | Validation      |
| ------------ | --------------- |
| Product Name | Required        |
| Product Code | Unique          |
| Price        | Greater than 0  |
| Category     | Required        |
| Status       | Active/Inactive |

---

## Business Rules

### BR-PRODUCT-001

Product code must be unique.

---

### BR-PRODUCT-002

Inactive products cannot be billed.

---

### BR-PRODUCT-003

Price changes affect only future bills.

---

## Acceptance Criteria

✔ Product successfully created

✔ Duplicate product codes rejected

✔ Active products available for sale

✔ Inactive products hidden from billing

---

# 21. Stock Management Module

## Purpose

The Stock Management module maintains inventory levels for all products, ensuring accurate product availability and preventing overselling.

---

## Business Objectives

- Maintain inventory accuracy.
- Prevent negative stock.
- Record all inventory movements.
- Support operational reporting.

---

## Features

### Stock Addition

Inventory can be increased when new stock arrives.

Information recorded:

- Product
- Quantity Added
- Date
- Staff Member
- Remarks (optional)

---

### Stock Adjustment

Authorized users may perform inventory corrections when necessary.

All adjustments are recorded for audit purposes.

---

### Stock Availability

System continuously tracks available quantity.

Billing operations depend on available stock.

---

### Stock History

Each inventory movement is recorded with:

- Product
- Quantity
- Operation Type
- Date
- User

---

## Stock Workflow

```text
Create Product
      │
      ▼
Add Inventory
      │
      ▼
Stock Available
      │
      ▼
Billing
      │
      ▼
Reduce Stock
      │
      ▼
Updated Inventory
```

---

## Functional Requirements

### FR-STOCK-001

Add inventory.

---

### FR-STOCK-002

Update stock quantity.

---

### FR-STOCK-003

View current inventory.

---

### FR-STOCK-004

Maintain stock history.

---

### FR-STOCK-005

Prevent negative inventory.

---

## Business Rules

### BR-STOCK-001

Stock cannot become negative.

---

### BR-STOCK-002

Billing is permitted only when sufficient stock exists.

---

### BR-STOCK-003

Every inventory movement must be recorded.

---

### BR-STOCK-004

Stock updates must occur atomically.

---

## Validation Rules

| Field          | Validation     |
| -------------- | -------------- |
| Product        | Required       |
| Quantity       | Greater than 0 |
| Product Exists | Yes            |

---

## Acceptance Criteria

✔ Stock added successfully

✔ Inventory reflects latest quantity

✔ Negative stock prevented

✔ Stock history maintained

---

# 22. Billing (POS) Module

## Purpose

The Billing module is the primary operational component of the application. It enables staff to process purchases using member wallet balances while simultaneously updating inventory and recording financial transactions.

This module connects all core business entities:

- Member
- Card
- Wallet
- Product
- Stock
- Transaction

---

## Business Objectives

- Enable fast checkout.
- Deduct wallet balance accurately.
- Reduce inventory automatically.
- Generate transaction history.
- Prevent invalid sales.

---

## Billing Workflow

```text
Identify Member
        │
        ▼
Verify Card
        │
        ▼
Load Wallet
        │
        ▼
Select Products
        │
        ▼
Calculate Bill
        │
        ▼
Validate Wallet Balance
        │
        ▼
Validate Stock
        │
        ▼
Create Bill
        │
        ▼
Deduct Wallet
        │
        ▼
Reduce Stock
        │
        ▼
Generate Transaction
        │
        ▼
Display Success
```

---

## Features

### Member Identification

The billing process begins by identifying the member using:

- Card
- Member Search
- Member ID

---

### Product Selection

Staff selects one or more products to create a bill.

Each product displays:

- Name
- Price
- Available Stock

---

### Bill Calculation

System automatically calculates:

- Line Item Total
- Grand Total
- Quantity
- Total Amount

---

### Wallet Verification

Before billing:

System verifies:

- Member exists
- Wallet exists
- Wallet is active
- Sufficient wallet balance

---

### Inventory Verification

Before completing billing:

System verifies:

- Product exists
- Product active
- Stock available

---

### Bill Confirmation

Upon successful validation:

System:

- Creates bill
- Deducts wallet balance
- Updates inventory
- Creates transaction record

---

## Billing Lifecycle

```text
Member
   │
   ▼
Wallet Verification
   │
   ▼
Product Selection
   │
   ▼
Bill Generation
   │
   ▼
Wallet Deduction
   │
   ▼
Inventory Reduction
   │
   ▼
Transaction Stored
   │
   ▼
Receipt Generated
```

---

## Functional Requirements

### FR-BILL-001

System shall create new bills.

---

### FR-BILL-002

System shall support multiple products in one bill.

---

### FR-BILL-003

System shall calculate totals automatically.

---

### FR-BILL-004

System shall verify wallet balance.

---

### FR-BILL-005

System shall verify inventory.

---

### FR-BILL-006

System shall deduct wallet balance.

---

### FR-BILL-007

System shall reduce inventory.

---

### FR-BILL-008

System shall record billing transaction.

---

### FR-BILL-009

System shall generate bill confirmation.

---

## Validation Rules

| Validation      | Requirement        |
| --------------- | ------------------ |
| Member Exists   | Required           |
| Wallet Exists   | Required           |
| Wallet Active   | Required           |
| Product Active  | Required           |
| Stock Available | Required           |
| Wallet Balance  | Must be sufficient |

---

# Critical Business Rules

## BR-BILL-001

A bill cannot be created for a non-existent member.

---

## BR-BILL-002

Wallet balance must be sufficient before purchase.

---

## BR-BILL-003

Products with zero stock cannot be billed.

---

## BR-BILL-004

Inventory must be reduced immediately after successful billing.

---

## BR-BILL-005

Wallet deduction and stock reduction must occur as a single atomic transaction to prevent inconsistent system state.

---

## BR-BILL-006

Failed billing must not modify wallet balance or inventory.

---

## BR-BILL-007

Every successful bill must create a financial transaction record.

---

## BR-BILL-008

Completed bills become part of the permanent sales history.

---

## Billing Process Flow

```text
Select Member
      │
      ▼
Verify Wallet
      │
      ▼
Add Products
      │
      ▼
Calculate Total
      │
      ▼
Balance Available?
      │
 ┌────┴────┐
 │         │
No        Yes
 │         │
 ▼         ▼
Reject   Check Stock
            │
     ┌──────┴──────┐
     │             │
    No            Yes
     │             │
     ▼             ▼
 Reject      Create Bill
                  │
                  ▼
         Deduct Wallet
                  │
                  ▼
         Reduce Inventory
                  │
                  ▼
        Create Transaction
                  │
                  ▼
          Billing Complete
```

---

## Acceptance Criteria

✔ Bill created successfully

✔ Multiple products supported

✔ Wallet balance validated

✔ Insufficient balance rejected

✔ Out-of-stock products rejected

✔ Wallet updated correctly

✔ Inventory updated correctly

✔ Transaction recorded successfully

✔ Billing completes atomically

---

# Module Relationship

```text
Products
     │
     ▼
Inventory
     │
     ▼
Billing
     │
 ┌───┼─────────────┐
 │   │             │
 ▼   ▼             ▼
Wallet Stock   Transaction
Update Update    History
```

---

# Reports, Security, Non-Functional Requirements & Product Completion

---

# 23. Reports & Analytics Module

## Purpose

The Reports module provides business owners and administrators with operational and financial insights by consolidating information generated across all modules. It enables informed decision-making through historical and real-time reporting.

---

## Business Objectives

- Monitor daily business performance.
- Track financial transactions.
- Analyze inventory movement.
- Review member activity.
- Support business audits.

---

## Available Reports

### Sales Report

Displays:

- Total Sales
- Daily Sales
- Monthly Sales
- Sales by Date Range
- Product-wise Sales

---

### Wallet Report

Displays:

- Current Wallet Balances
- Recharge History
- Debit History
- Wallet Activity

---

### Member Report

Displays:

- Total Members
- Active Members
- Inactive Members
- Member Registration Trends

---

### Product Report

Displays:

- Product List
- Product Availability
- Product Status

---

### Inventory Report

Displays:

- Current Stock Levels
- Stock Additions
- Low Stock Items
- Stock Movement History

---

### Transaction Report

Displays:

- Recharges
- Debits
- Billing Transactions
- Financial Summary

---

## Functional Requirements

### FR-REPORT-001

Generate sales reports.

### FR-REPORT-002

Generate wallet reports.

### FR-REPORT-003

Generate inventory reports.

### FR-REPORT-004

Generate member reports.

### FR-REPORT-005

Support date range filtering.

### FR-REPORT-006

Display transaction history.

---

## Business Rules

- Reports are read-only.
- Reports display only committed transactions.
- Users can only access reports permitted by their role.

---

## Acceptance Criteria

✔ Reports load successfully

✔ Data matches system records

✔ Filters operate correctly

✔ Unauthorized access prevented

---

# 24. Account Management Module

## Purpose

The Account module enables authenticated users to manage their own profile and credentials.

---

## Features

- View Profile
- Update Personal Information
- Change Password
- View Account Details

---

## Functional Requirements

### FR-ACCOUNT-001

View profile information.

### FR-ACCOUNT-002

Update profile.

### FR-ACCOUNT-003

Change password securely.

---

## Business Rules

- Users may modify only their own profile.
- Password changes require current password verification.
- New password is encrypted before storage.

---

## Acceptance Criteria

✔ Profile updated successfully

✔ Password changed securely

✔ Invalid password rejected

---

# 25. Security Requirements

## Authentication

- JWT-based authentication.
- Secure password hashing.
- Protected API routes.
- Session validation.

---

## Authorization

Role-based access control ensures users access only permitted modules.

---

## Password Security

- Passwords are never stored as plain text.
- Password comparison uses secure hashing.

---

## API Protection

Every protected endpoint validates:

- JWT
- User identity
- User role
- Account status

---

## Data Integrity

Critical operations such as:

- Billing
- Recharge
- Debit
- Stock Updates

must execute atomically to prevent partial updates.

---

# 26. Error Handling Requirements

The system shall provide meaningful error responses for:

### Authentication Errors

- Invalid credentials
- Expired session
- Unauthorized access

---

### Wallet Errors

- Wallet not found
- Insufficient balance
- Inactive wallet

---

### Billing Errors

- Product unavailable
- Insufficient stock
- Billing failure

---

### Product Errors

- Duplicate product
- Invalid price
- Product inactive

---

### Staff Errors

- Duplicate username
- Invalid role
- Disabled account

---

# 27. Non-Functional Requirements

## Performance

- Dashboard loads within 3 seconds.
- Billing response within 2 seconds under normal load.
- Search results within 1 second.

---

## Availability

- High system availability during business hours.
- Graceful handling of unexpected failures.

---

## Scalability

The system should support:

- Increasing member base.
- Larger product catalogs.
- Multiple staff accounts.
- Growing transaction volumes.

---

## Security

- JWT authentication.
- Password encryption.
- Input validation.
- Role-based authorization.
- Secure API access.

---

## Reliability

- No financial data loss.
- Accurate inventory updates.
- Consistent wallet balances.

---

## Maintainability

- Modular architecture.
- Separation of concerns.
- Reusable components.
- Service-based business logic.

---

# 28. Assumptions

The system assumes:

- Every member has at most one wallet.
- Every card belongs to one member.
- Products exist before stock is added.
- Wallet transactions occur only through authorized operations.
- Internet connectivity is available during system usage.

---

# 29. Constraints

- Wallet cannot have a negative balance.
- Stock cannot become negative.
- Billing requires sufficient wallet balance.
- Billing requires sufficient inventory.
- Unauthorized users cannot access protected resources.
- Duplicate product codes are not permitted.
- Duplicate usernames are not permitted.

---

# 30. Risks

| Risk                        | Mitigation                             |
| --------------------------- | -------------------------------------- |
| Incorrect wallet deductions | Atomic transactions and validation     |
| Inventory inconsistency     | Automatic stock validation and updates |
| Unauthorized access         | JWT authentication and RBAC            |
| Duplicate records           | Unique constraints and validation      |
| Financial data corruption   | Transaction logging and audit history  |

---

# 31. Future Enhancements

The following capabilities can be considered for future releases:

### Payment Gateway Integration

Allow wallet recharges using online payment methods.

---

### QR Code Billing

Support member identification through QR codes.

---

### Barcode Scanner Integration

Enable faster product selection during billing.

---

### Receipt Printing

Generate printable receipts compatible with thermal printers.

---

### Email & SMS Notifications

Notify members about:

- Wallet recharge
- Purchase confirmation
- Low wallet balance

---

### Advanced Reporting

- Revenue trends
- Customer analytics
- Product performance
- Staff performance

---

### Multi-Branch Support

Allow centralized management of multiple store locations.

---

### Mobile Application

Develop Android/iOS applications for staff and administrators.

---

# 32. Glossary

| Term          | Description                                      |
| ------------- | ------------------------------------------------ |
| Member        | Registered customer of the prepaid wallet system |
| Wallet        | Digital account storing prepaid balance          |
| Card          | Unique identifier linked to a member             |
| Recharge      | Addition of funds to a wallet                    |
| Debit         | Manual deduction of wallet balance               |
| Billing       | Purchase transaction using wallet funds          |
| Product       | Item available for sale                          |
| Stock         | Available inventory quantity                     |
| Transaction   | Permanent financial record                       |
| Administrator | User with complete system access                 |
| Staff         | Authorized operational user                      |

---

# 33. Product Scope Summary

The **Prepaid Wallet POS System** is a comprehensive business management application designed to simplify prepaid wallet operations by integrating customer management, digital wallets, inventory control, billing, and financial reporting into a unified platform.

### Core Modules

- Authentication & First-Time Setup
- Dashboard
- Staff Management
- Member Management
- Card Management
- Wallet Management
- Recharge Management
- Debit Management
- Product Management
- Stock Management
- Billing (POS)
- Transaction Management
- Reports & Analytics
- Account Management

### Key Business Capabilities

- Secure role-based authentication
- Digital prepaid wallet management
- Member and card lifecycle management
- Real-time inventory tracking
- Wallet-based billing
- Automated stock deduction
- Complete financial audit trail
- Operational reporting and analytics

---

# 34. Acceptance Criteria (Overall Product)

The product shall be considered complete when:

- All users authenticate securely.
- Administrators can manage staff, members, products, and inventory.
- Members can be assigned cards and wallets.
- Wallets support recharge and debit operations.
- Billing validates wallet balance and stock before completing sales.
- Inventory updates automatically after successful billing.
- Every financial operation generates a permanent transaction record.
- Reports accurately reflect system data.
- All protected resources enforce authentication and role-based access control.
- Business data remains consistent, secure, and auditable.

---

# Security Specification for BiteFlow POS

## Data Invariants
1. `orders`: Anyone (staff / customer) can create orders, but status transitions must follow valid workflow steps. Read access is permitted for POS & Kitchen operations.
2. `menuItems`: Read access allowed for all users. Write operations allowed for authenticated staff/admin.
3. `customers`: Read/write access allowed for staff/admin to manage credit tabs and records.
4. `settings`: Global configuration document. Read allowed for all users; write allowed for staff/admin.
5. `tabTransactions`: Read and write permitted for recording customer credit charges and repayments.

## Dirty Dozen Security Test Cases
1. Unauthenticated write attempt to `menuItems`
2. Oversized payload attack on `menuItems` (name > 100 chars)
3. Shadow field injection on `menuItems` (e.g. `isAdmin: true`)
4. Invalid ID injection on `orders` path
5. Status jump on `orders` (setting status to invalid string)
6. Negative price injection on `menuItems`
7. Unauthenticated write to `settings`
8. Tampering with `createdAt` timestamp
9. Spoofing customer balance on `customers` collection
10. Unbounded string injection into `kitchenNotes`
11. Invalid type injection (string into `total` field)
12. Attempt to list documents without authentication or valid constraints

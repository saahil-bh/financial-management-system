-- =========================================================
-- 1. USERS
-- =========================================================
INSERT INTO Users (u_id, name, email, role, password_hash, address)
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alice Admin', 'alice@example.com', 'Admin', 'bcrypt_hashed_password_placeholder_admin', '123 Admin St, Capital City'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bob User', 'bob@example.com', 'User', 'bcrypt_hashed_password_placeholder_user', '456 User Ave, Townsville');

-- =========================================================
-- 2. COMPANY PROFILE & BANK ACCOUNTS
-- =========================================================
INSERT INTO CompanyProfile (company_name, company_address, tax_id, phone, email)
VALUES ('Apex Solutions Inc.', '789 Business Rd, Suite 100, Metropolis', '12-3456789', '+1-555-0100', 'contact@apexsolutions.com');

INSERT INTO CompanyBankAccount (bank_name, account_name, account_number, swift_code, is_default)
VALUES 
('Metropolis City Bank', 'Apex Solutions Inc. - Operations', '9876543210', 'MCBKSGXX', TRUE),
('Global Commerce Bank', 'Apex Solutions Inc. - International', '1122334455', 'GCBKUS33', FALSE);

-- =========================================================
-- 3. QUOTATIONS + ITEMS
-- =========================================================

-- 3.1 Approved quotation
WITH q1 AS (
  INSERT INTO Quotations (u_id, status, total, tax, created_at, updated_at)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Approved', 1500.00, 105.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days')
  RETURNING q_id
)
INSERT INTO QuotationItems (q_id, description, quantity, unit_price)
SELECT q_id, 'Enterprise Software License (Annual)', 1, 1000.00 FROM q1
UNION ALL
SELECT q_id, 'Onboarding & Training Services', 5, 100.00 FROM q1;

-- 3.2 Draft quotation
WITH q2 AS (
  INSERT INTO Quotations (u_id, status, total, tax)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Draft', 350.00, 24.50)
  RETURNING q_id
)
INSERT INTO QuotationItems (q_id, description, quantity, unit_price)
SELECT q_id, 'Monthly Support Retainer', 1, 350.00 FROM q2;

-- 3.3 Rejected quotation (no items)
INSERT INTO Quotations (u_id, status, total, tax, created_at, updated_at)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Rejected', 80.00, 5.60, NOW() - INTERVAL '1 day', NOW());

-- =========================================================
-- 4. INVOICES + ITEMS
-- =========================================================

-- 4.1 Invoice generated from Approved quotation (q1)
WITH inv1 AS (
  INSERT INTO Invoices (q_id, status, total, due_date, u_id, created_at, updated_at)
  SELECT q_id, 'Paid', 1605.00, NOW() + INTERVAL '15 days', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW() - INTERVAL '1 day', NOW()
  FROM Quotations WHERE status = 'Approved'
  RETURNING i_id
)
INSERT INTO InvoiceItems (i_id, description, quantity, unit_price)
SELECT i_id, 'Enterprise Software License (Annual)', 1, 1000.00 FROM inv1
UNION ALL
SELECT i_id, 'Onboarding & Training Services', 5, 100.00 FROM inv1;

-- 4.2 Direct invoice (no quotation)
WITH inv2 AS (
  INSERT INTO Invoices (q_id, status, total, due_date, u_id)
  VALUES (NULL, 'Submitted', 450.00, NOW() + INTERVAL '30 days', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
  RETURNING i_id
)
INSERT INTO InvoiceItems (i_id, description, quantity, unit_price)
SELECT i_id, 'Ad-hoc Consulting Services', 3, 150.00 FROM inv2;

-- =========================================================
-- 5. RECEIPTS
-- =========================================================

-- Receipt for Paid invoice
WITH r1 AS (
  INSERT INTO Receipts (i_id, payment_date, amount, status, u_id, payment_method)
  SELECT i_id, NOW(), 1605.00, 'Approved', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bank Transfer'
  FROM Invoices WHERE status = 'Paid'
  RETURNING r_id
)
SELECT * FROM r1;

-- Pending receipt (deposit) for Submitted invoice
WITH r2 AS (
  INSERT INTO Receipts (i_id, payment_date, amount, status, u_id, payment_method)
  SELECT i_id, NOW(), 200.00, 'Pending', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Credit Card'
  FROM Invoices WHERE status = 'Submitted'
  RETURNING r_id
)
SELECT * FROM r2;

-- =========================================================
-- 6. NOTIFICATIONS
-- =========================================================
INSERT INTO Notifications (u_id, message, type)
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Invoice (Total: 450.00) has been submitted by Bob User for approval.', 'LINE'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Your Quotation (Total: 1500.00) has been approved by Admin.', 'Email'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Your payment of 1605.00 for your invoice has been confirmed.', 'Email');

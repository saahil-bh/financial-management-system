-- Create an Admin user
INSERT INTO Users (u_id, name, email, role, password_hash, address)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alice Admin', 'alice@example.com', 'Admin', 'bcrypt_hashed_password_placeholder_admin', '123 Admin St, Capital City');

-- Create a standard User
INSERT INTO Users (u_id, name, email, role, password_hash, address)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bob User', 'bob@example.com', 'User', 'bcrypt_hashed_password_placeholder_user', '456 User Ave, Townsville');

-- Create a company profile
INSERT INTO CompanyProfile (company_name, company_address, tax_id, phone, email)
VALUES ('Apex Solutions Inc.', '789 Business Rd, Suite 100, Metropolis', '12-3456789', '+1-555-0100', 'contact@apexsolutions.com');

-- Add a default bank account for the company
INSERT INTO CompanyBankAccount (bank_name, account_name, account_number, swift_code, is_default)
VALUES ('Metropolis City Bank', 'Apex Solutions Inc. - Operations', '9876543210', 'MCBKSGXX', TRUE);

-- Add a second bank account
INSERT INTO CompanyBankAccount (bank_name, account_name, account_number, swift_code, is_default)
VALUES ('Global Commerce Bank', 'Apex Solutions Inc. - International', '1122334455', 'GCBKUS33', FALSE);

-- 1. An 'Approved' quotation, created by Bob User
INSERT INTO Quotations (user_id, status, total, tax, created_at, updated_at)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Approved', 1500.00, 105.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');
-- Assuming this INSERT generates q_id = 1

-- 2. A 'Draft' quotation, also by Bob User
INSERT INTO Quotations (user_id, status, total, tax)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Draft', 350.00, 24.50);
-- Assuming this INSERT generates q_id = 2

-- 3. A 'Rejected' quotation
INSERT INTO Quotations (user_id, status, total, tax, created_at, updated_at)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Rejected', 80.00, 5.60, NOW() - INTERVAL '1 day', NOW());
-- Assuming this INSERT generates q_id = 3

-- Now, add items for the 'Approved' quotation (q_id = 1)
INSERT INTO QuotationItems (q_id, description, quantity, unit_price)
VALUES (1, 'Enterprise Software License (Annual)', 1, 1000.00);
INSERT INTO QuotationItems (q_id, description, quantity, unit_price)
VALUES (1, 'Onboarding & Training Services', 5, 100.00);

-- Add items for the 'Draft' quotation (q_id = 2)
INSERT INTO QuotationItems (q_id, description, quantity, unit_price)
VALUES (2, 'Monthly Support Retainer', 1, 350.00);

-- 1. A 'Paid' invoice generated from the approved quotation (q_id = 1)
INSERT INTO Invoices (q_id, status, total, due_date, u_id, created_at, updated_at)
VALUES (1, 'Paid', 1605.00, NOW() + INTERVAL '15 days', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW() - INTERVAL '1 day', NOW());
-- Assuming this INSERT generates i_id = 1
-- Total (1605.00) = Quotation total (1500.00) + Quotation tax (105.00)

-- 2. A 'Submitted' invoice created directly (no quotation)
INSERT INTO Invoices (q_id, status, total, due_date, u_id)
VALUES (NULL, 'Submitted', 450.00, NOW() + INTERVAL '30 days', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');
-- Assuming this INSERT generates i_id = 2

-- Add items for the 'Paid' invoice (i_id = 1)
-- These are often copied from the quotation
INSERT INTO InvoiceItems (i_id, description, quantity, unit_price)
VALUES (1, 'Enterprise Software License (Annual)', 1, 1000.00);
INSERT INTO InvoiceItems (i_id, description, quantity, unit_price)
VALUES (1, 'Onboarding & Training Services', 5, 100.00);

-- Add items for the 'Submitted' direct invoice (i_id = 2)
INSERT INTO InvoiceItems (i_id, description, quantity, unit_price)
VALUES (2, 'Ad-hoc Consulting Services', 3, 150.00);

-- 1. A 'Confirmed' receipt for the 'Paid' invoice (i_id = 1)
INSERT INTO Receipts (i_id, payment_date, amount, status, u_id, payment_method)
VALUES (1, NOW(), 1605.00, 'Confirmed', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bank Transfer');
-- Assuming this INSERT generates r_id = 1

-- 2. A 'Pending' receipt for the 'Submitted' invoice (i_id = 2), perhaps a deposit
INSERT INTO Receipts (i_id, payment_date, amount, status, u_id, payment_method)
VALUES (2, NOW(), 200.00, 'Pending', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Credit Card');
-- Assuming this INSERT generates r_id = 2

-- 1. Notification to Admin (Alice) that an invoice needs approval
INSERT INTO Notifications (u_id, message, type)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Invoice I-2 (Total: 450.00) has been submitted by Bob User for approval.', 'LINE');

-- 2. Notification to User (Bob) that his quotation was approved
INSERT INTO Notifications (u_id, message, type)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Your Quotation Q-1 (Total: 1500.00) has been approved by Admin.', 'Email');

-- 3. Notification to User (Bob) that his receipt was confirmed
INSERT INTO Notifications (u_id, message, type)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Your payment of 1605.00 for Invoice I-1 has been confirmed.', 'Email');
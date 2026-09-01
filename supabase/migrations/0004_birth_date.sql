-- Registration collected age (a number) — switched to date of birth (a real date) for a clearer,
-- native calendar picker on the register/profile forms instead of a plain number input.
alter table public.profiles drop column if exists age;
alter table public.profiles add column if not exists birth_date date check (birth_date <= current_date);

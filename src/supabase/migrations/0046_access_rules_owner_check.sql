-- HOTFIX 2026-08-19: AccessRules.jsx-ийн ROLES жагсаалтад "owner" (Сууц
-- өмчлөгч OwnerApp) нэмсэн ч, access_rules хүснэгэлийн CHECK constraint
-- үүнийг зөвшөөрдөггүй байсан тул хадгалахад "new row for relation
-- access_rules violates check constraint access_rules_role_check" гэсэн
-- алдаа гарч, SUPERSYSADMIN ч гэсэн owner ролийн эрхийг тохируулж
-- чадахгүй байв.
alter table access_rules drop constraint access_rules_role_check;
alter table access_rules add constraint access_rules_role_check
  check (role = ANY (ARRAY['board'::text, 'supervisory_board'::text, 'executive_director'::text, 'accountant'::text, 'manager'::text, 'owner'::text]));

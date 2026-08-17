-- Integrated Systems (Cosmo) — owners хүснэгэлийн "cadastral_no" баганыг
-- "property_no" гэж сольж нэрлэв (Clientele хүснэгэлийн нэршилтэй нийцүүлэв).

alter table owners rename column cadastral_no to property_no;

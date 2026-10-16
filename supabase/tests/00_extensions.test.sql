begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select has_extension('postgis', 'PostGIS is installed');

select * from finish();
rollback;

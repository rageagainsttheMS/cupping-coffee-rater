-- Reports are free text from the reporter. Keep them to a sensible length.
alter table public.review_reports
  add constraint review_reports_details_length check (details is null or char_length(details) <= 500);

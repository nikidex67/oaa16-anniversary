create or replace function public.sync_registration_to_mailchimp()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://us8.api.mailchimp.com/3.0/lists/8bb5e1643c/members',
    headers := jsonb_build_object(
      'Authorization', 'Basic ' || encode(('any:<MAILCHIMP_API_KEY>')::bytea, 'base64'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'email_address', lower(new.email),
      'status', 'subscribed',
      'merge_fields', jsonb_build_object(
        'FNAME', new.first_name,
        'LNAME', new.last_name,
        'NICKNAME', coalesce(new.nickname, ''),
        'HOUSE', new.house,
        'CLASS', new.class_group
      ),
      'tags', (select jsonb_agg(t) from unnest(array[new.house, new.class_group]) as t where t is not null and t <> '')
    )
  );
  return new;
end;
$$;

drop trigger if exists registrations_to_mailchimp on public.registrations;
create trigger registrations_to_mailchimp
  after insert on public.registrations
  for each row execute function public.sync_registration_to_mailchimp();

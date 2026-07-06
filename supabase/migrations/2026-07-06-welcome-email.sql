create or replace function public.send_welcome_on_registration()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://gbrbmtwpugxmenrfkloh.supabase.co/functions/v1/send-welcome',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<WELCOME_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists registrations_send_welcome on public.registrations;
create trigger registrations_send_welcome
  after insert on public.registrations
  for each row execute function public.send_welcome_on_registration();

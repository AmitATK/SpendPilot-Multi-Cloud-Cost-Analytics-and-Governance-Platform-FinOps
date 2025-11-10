insert into orgs(id, name) values('00000000-0000-0000-0000-000000000000','Demo Org') on conflict do nothing;

insert into cloud_accounts(org_id, provider, account_id, display_name)
values('00000000-0000-0000-0000-000000000000','aws','111122223333','aws-main')
on conflict do nothing;

insert into alert_channels(org_id, channel, target)
values('00000000-0000-0000-0000-000000000000','email','you@example.com')
on conflict do nothing;

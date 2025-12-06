/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// finops-backend/scripts/seed.ts
import { Pool } from 'pg';
const pg = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/postgres',
});

(async () => {
  const org = '00000000-0000-0000-0000-000000000000';
  await pg.query(
    `INSERT INTO org_settings(org_id, settings) VALUES ($1,$2)
    ON CONFLICT (org_id) DO UPDATE SET settings=EXCLUDED.settings`,
    [
      org,
      JSON.stringify({ requiredTags: ['owner', 'env', 'team', 'cost_center'] }),
    ],
  );

  await pg.query(
    `INSERT INTO alert_channels(org_id, channel, target, active)
                  VALUES ($1,'email',$2,true) ON CONFLICT DO NOTHING`,
    [org, 'you@example.com'],
  );

  await pg.query(
    `INSERT INTO budgets(org_id,name,monthly_limit,thresholds,currency,active)
                  VALUES ($1,'Demo Budget','500.00','{70,90,100}','USD',true) ON CONFLICT DO NOTHING`,
    [org],
  );

  console.log('Seeded demo settings/channels/budget.');
  process.exit(0);
})();

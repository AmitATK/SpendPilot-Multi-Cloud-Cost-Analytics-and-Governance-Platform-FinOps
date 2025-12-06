/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { Pool } from 'pg';

@Module({
  controllers: [HealthController],
  providers: [
    // Provide a shared pg Pool if you aren't already doing so elsewhere
    {
      provide: 'PG_POOL',
      useFactory: () =>
        new Pool({
          connectionString:
            process.env.DATABASE_URL ||
            'postgres://postgres:postgres@localhost:5432/postgres',
        }),
    },
  ],
  exports: ['PG_POOL'],
})
export class HealthModule {}

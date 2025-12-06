/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      // primary factory that creates the actual Pool
      provide: 'PG',
      useFactory: async () => {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        return pool;
      },
    },
    {
      // expose the same instance under the class token
      provide: Pool,
      useExisting: 'PG',
    },
  ],
  exports: ['PG', Pool],
})
export class DatabaseModule {}

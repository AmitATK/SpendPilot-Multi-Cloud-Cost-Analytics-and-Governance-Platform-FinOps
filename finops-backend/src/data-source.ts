import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Org } from './entities/org.entity';
import { User } from './entities/user.entity';
import { UserOrgRole } from './entities/user-org-role.entity';
import { CloudAccount } from './entities/cloud-account.entity';
import { Resource } from './entities/resource.entity';
import { ResourceUsageDaily } from './entities/resource-usage-daily.entity';
import { Budget } from './entities/budget.entity';
import { BudgetEvent } from './entities/budget-event.entity';
import { AlertChannel } from './entities/alert-channel.entity';
import { CleanupSuggestion } from './entities/cleanup-suggestion.entity';
import { Anomaly } from './entities/anomaly.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Org,
    User,
    UserOrgRole,
    CloudAccount,
    Resource,
    ResourceUsageDaily,
    Budget,
    BudgetEvent,
    AlertChannel,
    CleanupSuggestion,
    Anomaly,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

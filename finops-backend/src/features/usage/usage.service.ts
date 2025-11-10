import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudAccount } from '../../entities/cloud-account.entity';
import { ResourceUsageDaily } from '../../entities/resource-usage-daily.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(CloudAccount) private accounts: Repository<CloudAccount>,
    @InjectRepository(ResourceUsageDaily) private usageRepo: Repository<ResourceUsageDaily>,
  ) {}

  async insertMockDaily(orgId: string, day: string) {
    const acct = await this.accounts.findOne({ where: { orgId } });
    if (!acct) throw new Error('No cloud account found for org. Seed cloud_accounts first.');

    const services = ['EC2', 'S3', 'Lambda', 'RDS'];
    const rows = services.map((s) =>
      this.usageRepo.create({
        orgId,
        accountId: acct.id,
        service: s,
        usageDate: day,
        quantity: '1',
        unit: 'unit',
        unblendedCost: (Math.round((Math.random() * 5000 + 1000) * 100) / 100).toString(),
        currency: 'INR',
        tags: {},
      }),
    );
    await this.usageRepo.save(rows);
  }

  // TODO: import AWS CUR (S3) -> normalize -> ResourceUsageDaily
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Org } from './org.entity';
import { CloudAccount } from './cloud-account.entity';
import { Resource } from './resource.entity';

@Entity('resource_usage_daily')
@Index(['orgId', 'usageDate', 'service'])
export class ResourceUsageDaily {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Org)
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column('uuid', { name: 'account_id' })
  accountId!: string;

  @ManyToOne(() => CloudAccount)
  @JoinColumn({ name: 'account_id' })
  account!: CloudAccount;

  @Column({ name: 'resource_id', type: 'int', nullable: true })
  resourceId?: number;

  @ManyToOne(() => Resource, { nullable: true })
  @JoinColumn({ name: 'resource_id' })
  resource?: Resource;

  @Column({ type: 'text' })
  service!: string;

  @Column({ name: 'usage_date', type: 'date' })
  usageDate!: string; // YYYY-MM-DD

  @Column({ type: 'numeric', nullable: true })
  quantity?: string;

  @Column({ type: 'text', nullable: true })
  unit?: string;

  @Column({ name: 'unblended_cost', type: 'numeric' })
  unblendedCost!: string;

  @Column({ type: 'text', default: 'INR' })
  currency!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  tags!: Record<string, any>;
}

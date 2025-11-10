import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Org } from './org.entity';
import { CloudAccount } from './cloud-account.entity';

@Entity('resources')
@Index(['orgId', 'service', 'region'])
export class Resource {
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

  @Column({ type: 'text' })
  service!: string;

  @Column({ type: 'text', nullable: true })
  region?: string | null;

  @Column({ name: 'resource_arn', type: 'text', nullable: true })
  resourceArn?: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  tags!: Record<string, any>;

  @Column({ name: 'first_seen', type: 'date', default: () => 'current_date' })
  firstSeen!: string;

  @Column({ name: 'last_seen', type: 'date', default: () => 'current_date' })
  lastSeen!: string;
}

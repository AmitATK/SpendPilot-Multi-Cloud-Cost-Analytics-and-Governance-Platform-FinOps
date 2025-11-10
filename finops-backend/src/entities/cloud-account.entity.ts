import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, JoinColumn } from 'typeorm';
import { Org } from './org.entity';

export type Provider = 'aws' | 'azure' | 'gcp';

@Entity('cloud_accounts')
@Unique('uq_cloud_acct', ['orgId', 'provider', 'accountId'])
export class CloudAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Org)
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column({ type: 'text' })
  provider!: Provider;

  @Column({ name: 'account_id', type: 'text' })
  accountId!: string;

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName?: string;

  // Optional column; TypeORM will add it if not present
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  labels!: Record<string, any>;
}

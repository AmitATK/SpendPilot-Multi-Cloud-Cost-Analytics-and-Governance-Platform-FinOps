import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Org } from './org.entity';

export type AlertChannelType = 'email' | 'slack';

@Entity('alert_channels')
export class AlertChannel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Org)
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column({ type: 'text' })
  channel!: AlertChannelType;

  @Column({ type: 'text' })
  target!: string; // email or webhook

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  scope!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

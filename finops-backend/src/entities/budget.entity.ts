import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Org } from './org.entity';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Org)
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'jsonb' })
  scope!: Record<string, any>; // e.g. { team: 'checkout' }

  @Column({ name: 'monthly_limit', type: 'numeric' })
  monthlyLimit!: string;

  @Column('int', { array: true, default: () => 'ARRAY[70,90,100]' })
  thresholds!: number[];

  @Column({ type: 'text', default: 'INR' })
  currency!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

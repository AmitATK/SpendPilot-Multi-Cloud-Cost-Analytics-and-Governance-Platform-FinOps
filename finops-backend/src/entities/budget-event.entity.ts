import { Entity, PrimaryGeneratedColumn, Column, Unique, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Budget } from './budget.entity';
import { Org } from './org.entity';

@Entity('budget_events')
@Unique(['budgetId', 'periodStart', 'threshold'])
export class BudgetEvent {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Org)
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column('uuid', { name: 'budget_id' })
  budgetId!: string;

  @ManyToOne(() => Budget)
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ type: 'int' })
  threshold!: number;

  @CreateDateColumn({ name: 'fired_at', type: 'timestamptz' })
  firedAt!: Date;
}

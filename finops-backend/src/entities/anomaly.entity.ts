import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('anomalies')
export class Anomaly {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  scope!: Record<string, any>; // e.g. { service: 'EC2' }

  @CreateDateColumn({ name: 'detected_at', type: 'timestamptz' })
  detectedAt!: Date;

  @Column({ type: 'text', default: 'day' })
  granularity!: 'day' | 'hour';

  @Column({ name: 'for_date', type: 'date' })
  forDate!: string; // YYYY-MM-DD

  @Column({ type: 'numeric' })
  expected!: string;

  @Column({ type: 'numeric' })
  actual!: string;

  @Column({ name: 'z_score', type: 'numeric' })
  zScore!: string;

  @Column({ type: 'text' })
  severity!: 'low' | 'medium' | 'high';

  @Column({ type: 'text', default: 'z-score' })
  method!: string;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Org } from './org.entity';
import { Resource } from './resource.entity';

export type SuggestionKind = 'unused' | 'idle' | 'old_snapshot';
export type SuggestionStatus = 'open' | 'accepted' | 'dismissed';

@Entity('cleanup_suggestions')
export class CleanupSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => Org)
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column({ name: 'resource_id', type: 'int', nullable: true })
  resourceId?: number;

  @ManyToOne(() => Resource, { nullable: true })
  @JoinColumn({ name: 'resource_id' })
  resource?: Resource;

  @Column({ type: 'text' })
  kind!: SuggestionKind;

  @Column({ name: 'detected_on', type: 'date', default: () => 'current_date' })
  detectedOn!: string;

  @Column({ type: 'jsonb' })
  current!: Record<string, any>;

  @Column({ type: 'jsonb' })
  proposed!: Record<string, any>;

  @Column({ name: 'est_savings', type: 'numeric', nullable: true })
  estSavings?: string;

  @Column({ type: 'text', default: 'open' })
  status!: SuggestionStatus;
}

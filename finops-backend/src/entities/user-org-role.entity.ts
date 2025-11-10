import { Entity, Column, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Org } from './org.entity';

export type OrgRole = 'ADMIN' | 'FINANCE' | 'TEAM_LEAD';

@Entity('user_org_roles')
export class UserOrgRole {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @PrimaryColumn('uuid', { name: 'org_id' })
  orgId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Org, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org!: Org;

  @Column({ type: 'text' })
  role!: OrgRole;
}

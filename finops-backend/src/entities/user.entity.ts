import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' }) // DB is citext; text mapping is fine
  email!: string;

  @Column({ type: 'text', nullable: true })
  name?: string;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

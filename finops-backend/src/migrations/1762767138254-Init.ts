import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1762767138254 implements MigrationInterface {
    name = 'Init1762767138254'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "password_hash" text`);
        await queryRunner.query(`ALTER TABLE "cloud_accounts" ALTER COLUMN "labels" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "tags" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "resource_usage_daily" ALTER COLUMN "tags" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "budgets" ALTER COLUMN "thresholds" SET DEFAULT ARRAY[70,90,100]`);
        await queryRunner.query(`ALTER TABLE "alert_channels" ALTER COLUMN "scope" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "anomalies" ALTER COLUMN "scope" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "anomalies" ALTER COLUMN "scope" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "alert_channels" ALTER COLUMN "scope" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "budgets" ALTER COLUMN "thresholds" SET DEFAULT ARRAY[70, 90, 100]`);
        await queryRunner.query(`ALTER TABLE "resource_usage_daily" ALTER COLUMN "tags" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "tags" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "cloud_accounts" ALTER COLUMN "labels" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
    }

}

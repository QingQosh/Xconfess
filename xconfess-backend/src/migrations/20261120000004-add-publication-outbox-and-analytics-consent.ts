import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicationOutboxAndAnalyticsConsent20261120000004 implements MigrationInterface {
  name = 'AddPublicationOutboxAndAnalyticsConsent20261120000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "publication_outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "confession_id" uuid NOT NULL,
        "event_type" varchar(64) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'PENDING',
        "checkpoint_seq" bigint NOT NULL DEFAULT 0,
        "attempts" integer NOT NULL DEFAULT 0,
        "max_attempts" integer NOT NULL DEFAULT 5,
        "dedup_key" varchar(128) NOT NULL UNIQUE,
        "last_error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "delivered_at" timestamptz,
        CONSTRAINT "PK_publication_outbox_events" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_publication_outbox_events_status_created"
        ON "publication_outbox_events" ("status", "created_at");

      CREATE TABLE IF NOT EXISTS "analytics_consent_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "policy_version" varchar(64) NOT NULL,
        "consent_given" boolean NOT NULL DEFAULT false,
        "withdrawn_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_consent_records" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_analytics_consent_user_policy" UNIQUE ("user_id", "policy_version")
      );
      CREATE INDEX IF NOT EXISTS "IDX_analytics_consent_user_id"
        ON "analytics_consent_records" ("user_id");

      CREATE TABLE IF NOT EXISTS "user_collection_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "collection_id" uuid NOT NULL,
        "confession_id" uuid NOT NULL,
        "added_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_collection_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_collection_items_pair" UNIQUE ("collection_id", "confession_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "user_collection_items"');
    await queryRunner.query('DROP TABLE IF EXISTS "analytics_consent_records"');
    await queryRunner.query('DROP TABLE IF EXISTS "publication_outbox_events"');
  }
}

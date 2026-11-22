import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserCollections20261120000003 implements MigrationInterface {
  name = 'CreateUserCollections20261120000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_collections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_private" boolean NOT NULL DEFAULT true,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_collections" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_user_collections_user_order"
        ON "user_collections" ("user_id", "display_order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "user_collections"');
  }
}

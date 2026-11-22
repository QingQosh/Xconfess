import { Injectable } from '@nestjs/common';
import {
  FieldClassification,
  SchemaCompletenessReport,
  SensitivityLevel,
} from './data-classification.types';

@Injectable()
export class DataClassificationRegistry {
  private readonly classifications: Map<string, FieldClassification> = new Map();

  constructor() {
    this.registerCoreClassifications();
  }

  private makeKey(entity: string, field: string): string {
    return `${entity.toLowerCase()}.${field.toLowerCase()}`;
  }

  /**
   * Registers a single field classification
   */
  register(classification: FieldClassification): void {
    const key = this.makeKey(classification.entityName, classification.fieldName);
    this.classifications.set(key, classification);
  }

  /**
   * Retrieves classification for a specific entity field
   */
  getClassification(entityName: string, fieldName: string): FieldClassification | undefined {
    return this.classifications.get(this.makeKey(entityName, fieldName));
  }

  /**
   * Retrieves all classifications matching a sensitivity level
   */
  getBySensitivity(level: SensitivityLevel): FieldClassification[] {
    return Array.from(this.classifications.values()).filter((c) => c.sensitivity === level);
  }

  /**
   * Returns all registered classifications
   */
  getAll(): FieldClassification[] {
    return Array.from(this.classifications.values());
  }

  /**
   * Validates schema completeness against entities and their fields.
   * Emits warnings/errors for any unmapped persisted fields.
   */
  validateSchemaCompleteness(
    schemaDefinition: Record<string, string[]>,
  ): SchemaCompletenessReport {
    const unmapped: Array<{ entity: string; field: string }> = [];
    let totalFields = 0;
    const entityNames = Object.keys(schemaDefinition);

    for (const entity of entityNames) {
      const fields = schemaDefinition[entity] || [];
      for (const field of fields) {
        totalFields++;
        if (!this.classifications.has(this.makeKey(entity, field))) {
          unmapped.push({ entity, field });
        }
      }
    }

    return {
      isComplete: unmapped.length === 0,
      totalEntitiesChecked: entityNames.length,
      totalFieldsChecked: totalFields,
      mappedFieldsCount: totalFields - unmapped.length,
      unmappedFields: unmapped,
    };
  }

  private registerCoreClassifications(): void {
    // User Entity
    this.register({
      entityName: 'User',
      fieldName: 'id',
      sensitivity: 'INTERNAL',
      owner: 'SYSTEM',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXPORTABLE',
      description: 'Internal unique identifier for the user account',
    });
    this.register({
      entityName: 'User',
      fieldName: 'email',
      sensitivity: 'RESTRICTED_PII',
      owner: 'USER',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXPORTABLE',
      description: 'Account recovery and communication email address',
    });
    this.register({
      entityName: 'User',
      fieldName: 'passwordHash',
      sensitivity: 'RESTRICTED_PII',
      owner: 'SYSTEM',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXCLUDED',
      description: 'Argon2id password hash, strictly excluded from exports and logs',
    });
    this.register({
      entityName: 'User',
      fieldName: 'username',
      sensitivity: 'PUBLIC',
      owner: 'USER',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXPORTABLE',
      description: 'Public profile handle',
    });
    this.register({
      entityName: 'User',
      fieldName: 'avatarUrl',
      sensitivity: 'PUBLIC',
      owner: 'USER',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXPORTABLE',
      description: 'Public avatar media link',
    });

    // Confession Entity
    this.register({
      entityName: 'Confession',
      fieldName: 'id',
      sensitivity: 'PUBLIC',
      owner: 'SYSTEM',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXPORTABLE',
      description: 'Identifier for the published confession',
    });
    this.register({
      entityName: 'Confession',
      fieldName: 'content',
      sensitivity: 'PUBLIC',
      owner: 'USER',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'EXPORTABLE',
      description: 'User-submitted confession body text',
    });
    this.register({
      entityName: 'Confession',
      fieldName: 'authorId',
      sensitivity: 'CONFIDENTIAL',
      owner: 'USER',
      retention: 'ACCOUNT_LIFETIME',
      exportBehavior: 'REDACTED',
      description: 'Reference to confession author, redacted for anonymous posts',
    });

    // AnalyticsEvent Entity
    this.register({
      entityName: 'AnalyticsEvent',
      fieldName: 'id',
      sensitivity: 'INTERNAL',
      owner: 'SYSTEM',
      retention: 'EPHEMERAL_30D',
      exportBehavior: 'EXCLUDED',
      description: 'Internal event identifier',
    });
    this.register({
      entityName: 'AnalyticsEvent',
      fieldName: 'actorId',
      sensitivity: 'CONFIDENTIAL',
      owner: 'USER',
      retention: 'EPHEMERAL_30D',
      exportBehavior: 'REDACTED',
      description: 'Pseudonymous actor identifier associated with the event',
    });
    this.register({
      entityName: 'AnalyticsEvent',
      fieldName: 'eventName',
      sensitivity: 'INTERNAL',
      owner: 'SYSTEM',
      retention: 'EPHEMERAL_30D',
      exportBehavior: 'EXPORTABLE',
      description: 'Action name for telemetry analysis',
    });
  }
}

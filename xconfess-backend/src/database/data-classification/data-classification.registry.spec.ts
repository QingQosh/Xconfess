import { Test, TestingModule } from '@nestjs/testing';
import { DataClassificationRegistry } from './data-classification.registry';

describe('DataClassificationRegistry', () => {
  let registry: DataClassificationRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataClassificationRegistry],
    }).compile();

    registry = module.get<DataClassificationRegistry>(DataClassificationRegistry);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  it('should retrieve classification for registered fields', () => {
    const classification = registry.getClassification('User', 'email');
    expect(classification).toBeDefined();
    expect(classification?.sensitivity).toEqual('RESTRICTED_PII');
    expect(classification?.owner).toEqual('USER');
    expect(classification?.exportBehavior).toEqual('EXPORTABLE');
  });

  it('should filter classifications by sensitivity level', () => {
    const piiFields = registry.getBySensitivity('RESTRICTED_PII');
    expect(piiFields.length).toBeGreaterThanOrEqual(2);
    expect(piiFields.some((f) => f.fieldName === 'passwordHash')).toBe(true);
  });

  it('should validate schema completeness and flag unmapped fields', () => {
    const schemaToCheck = {
      User: ['id', 'email', 'unmappedCustomField'],
      Confession: ['id', 'content'],
    };

    const report = registry.validateSchemaCompleteness(schemaToCheck);
    expect(report.isComplete).toBe(false);
    expect(report.unmappedFields.length).toEqual(1);
    expect(report.unmappedFields[0]).toEqual({
      entity: 'User',
      field: 'unmappedCustomField',
    });
  });

  it('should pass schema completeness when all fields are classified', () => {
    const completeSchema = {
      User: ['id', 'email'],
      Confession: ['id', 'content'],
    };

    const report = registry.validateSchemaCompleteness(completeSchema);
    expect(report.isComplete).toBe(true);
    expect(report.unmappedFields.length).toEqual(0);
  });
});

import {
  OpenApiContractValidator,
  SchemaDefinition,
  ClientTypeDefinition,
} from './openapi-contract-validator';

describe('OpenApiContractValidator - Cross-Layer Drift Detection', () => {
  let validator: OpenApiContractValidator;

  beforeEach(() => {
    validator = new OpenApiContractValidator();
  });

  const validOpenApiSchema: SchemaDefinition = {
    required: ['id', 'message'],
    properties: {
      id: { type: 'string' },
      message: { type: 'string' },
      viewCount: { type: 'number', default: 0 },
    },
  };

  const validClientType: ClientTypeDefinition = {
    properties: {
      id: { type: 'string', optional: false, nullable: false },
      message: { type: 'string', optional: false, nullable: false },
      viewCount: { type: 'number', optional: true, nullable: false, defaultValue: 0 },
    },
  };

  it('validates matching OpenAPI and client definitions with no drift', () => {
    const result = validator.validateSchemas(
      { Confession: validOpenApiSchema },
      { Confession: validClientType },
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.totalModelsChecked).toBe(1);
    expect(result.totalPropertiesChecked).toBe(3);
  });

  it('detects missing property drift when client type omits a field', () => {
    const incompleteClientType: ClientTypeDefinition = {
      properties: {
        id: { type: 'string', optional: false, nullable: false },
      },
    };

    const result = validator.validateSchemas(
      { Confession: validOpenApiSchema },
      { Confession: incompleteClientType },
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.kind === 'MISSING_PROPERTY' && i.property === 'message')).toBe(true);
  });

  it('detects nullability drift when an OpenAPI required field is made optional in client', () => {
    const driftedClientType: ClientTypeDefinition = {
      properties: {
        id: { type: 'string', optional: false, nullable: false },
        message: { type: 'string', optional: true, nullable: true }, // drift
        viewCount: { type: 'number', optional: false, nullable: false, defaultValue: 0 },
      },
    };

    const result = validator.validateSchemas(
      { Confession: validOpenApiSchema },
      { Confession: driftedClientType },
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.kind === 'NULLABILITY_DRIFT')).toBe(true);
  });

  it('detects default value drift between layers', () => {
    const mismatchedDefaultClient: ClientTypeDefinition = {
      properties: {
        id: { type: 'string', optional: false, nullable: false },
        message: { type: 'string', optional: false, nullable: false },
        viewCount: { type: 'number', optional: false, nullable: false, defaultValue: 100 }, // drift from 0
      },
    };

    const result = validator.validateSchemas(
      { Confession: validOpenApiSchema },
      { Confession: mismatchedDefaultClient },
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.kind === 'DEFAULT_VALUE_DRIFT')).toBe(true);
  });
});

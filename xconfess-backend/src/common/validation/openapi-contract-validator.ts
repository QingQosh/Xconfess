export interface SchemaProperty {
  type: string;
  required?: boolean;
  nullable?: boolean;
  default?: any;
}

export interface SchemaDefinition {
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface ClientTypeDefinition {
  properties: Record<
    string,
    {
      type: string;
      optional: boolean;
      nullable: boolean;
      defaultValue?: any;
    }
  >;
}

export interface ContractDriftIssue {
  model: string;
  property: string;
  kind: 'MISSING_PROPERTY' | 'TYPE_MISMATCH' | 'NULLABILITY_DRIFT' | 'DEFAULT_VALUE_DRIFT';
  expected: any;
  actual: any;
  message: string;
}

export interface ContractValidationResult {
  valid: boolean;
  totalModelsChecked: number;
  totalPropertiesChecked: number;
  issues: ContractDriftIssue[];
}

export class OpenApiContractValidator {
  validateModel(
    modelName: string,
    openApiSchema: SchemaDefinition,
    clientType: ClientTypeDefinition,
  ): ContractDriftIssue[] {
    const issues: ContractDriftIssue[] = [];
    const openApiProps = openApiSchema.properties || {};
    const clientProps = clientType.properties || {};
    const requiredSet = new Set(openApiSchema.required || []);

    for (const [propName, openApiProp] of Object.entries(openApiProps)) {
      const clientProp = clientProps[propName];

      if (!clientProp) {
        issues.push({
          model: modelName,
          property: propName,
          kind: 'MISSING_PROPERTY',
          expected: openApiProp.type,
          actual: undefined,
          message: `Client type '${modelName}' is missing required OpenAPI property '${propName}'`,
        });
        continue;
      }

      // Check type alignment
      if (clientProp.type !== openApiProp.type) {
        issues.push({
          model: modelName,
          property: propName,
          kind: 'TYPE_MISMATCH',
          expected: openApiProp.type,
          actual: clientProp.type,
          message: `Type mismatch for ${modelName}.${propName}: OpenAPI expects '${openApiProp.type}', client has '${clientProp.type}'`,
        });
      }

      // Check nullability drift
      const isRequiredInOpenApi = requiredSet.has(propName);
      if (isRequiredInOpenApi && (clientProp.optional || clientProp.nullable)) {
        issues.push({
          model: modelName,
          property: propName,
          kind: 'NULLABILITY_DRIFT',
          expected: { required: true, nullable: false },
          actual: { optional: clientProp.optional, nullable: clientProp.nullable },
          message: `Nullability drift: ${modelName}.${propName} is required in OpenAPI but nullable/optional in client`,
        });
      }

      // Check default value drift if defined in OpenAPI
      if (
        openApiProp.default !== undefined &&
        clientProp.defaultValue !== undefined &&
        openApiProp.default !== clientProp.defaultValue
      ) {
        issues.push({
          model: modelName,
          property: propName,
          kind: 'DEFAULT_VALUE_DRIFT',
          expected: openApiProp.default,
          actual: clientProp.defaultValue,
          message: `Default value mismatch for ${modelName}.${propName}: OpenAPI default is ${openApiProp.default}, client default is ${clientProp.defaultValue}`,
        });
      }
    }

    return issues;
  }

  validateSchemas(
    openApiModels: Record<string, SchemaDefinition>,
    clientModels: Record<string, ClientTypeDefinition>,
  ): ContractValidationResult {
    const allIssues: ContractDriftIssue[] = [];
    let propertiesChecked = 0;

    for (const [modelName, openApiSchema] of Object.entries(openApiModels)) {
      const clientModel = clientModels[modelName];
      if (!clientModel) {
        allIssues.push({
          model: modelName,
          property: '*',
          kind: 'MISSING_PROPERTY',
          expected: 'Model definition',
          actual: undefined,
          message: `Client is completely missing model definition for '${modelName}'`,
        });
        continue;
      }

      propertiesChecked += Object.keys(openApiSchema.properties || {}).length;
      const modelIssues = this.validateModel(modelName, openApiSchema, clientModel);
      allIssues.push(...modelIssues);
    }

    return {
      valid: allIssues.length === 0,
      totalModelsChecked: Object.keys(openApiModels).length,
      totalPropertiesChecked: propertiesChecked,
      issues: allIssues,
    };
  }
}

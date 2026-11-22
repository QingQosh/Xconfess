export type SensitivityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII';

export type DataOwner = 'USER' | 'SYSTEM' | 'ORGANIZATION';

export type RetentionCategory =
  | 'EPHEMERAL_30D'
  | 'ACCOUNT_LIFETIME'
  | 'LEGAL_7Y'
  | 'PERMANENT';

export type ExportBehavior = 'EXPORTABLE' | 'REDACTED' | 'EXCLUDED';

export interface FieldClassification {
  entityName: string;
  fieldName: string;
  sensitivity: SensitivityLevel;
  owner: DataOwner;
  retention: RetentionCategory;
  exportBehavior: ExportBehavior;
  description: string;
}

export interface SchemaCompletenessReport {
  isComplete: boolean;
  totalEntitiesChecked: number;
  totalFieldsChecked: number;
  mappedFieldsCount: number;
  unmappedFields: Array<{ entity: string; field: string }>;
}

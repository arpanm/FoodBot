/**
 * Types for the Schema Registry module.
 *
 * Provides type definitions for schema management, validation,
 * and compatibility checking of event schemas.
 */

/** Compatibility modes for schema evolution */
export type CompatibilityMode = 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';

/** JSON Schema property definition */
export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: unknown;
}

/** JSON Schema definition for event validation */
export interface EventSchema {
  subject: string;
  version: number;
  schema: JsonSchemaDefinition;
  createdAt: Date;
}

/** JSON Schema definition structure */
export interface JsonSchemaDefinition {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/** Result of registering a schema */
export interface SchemaRegistration {
  subject: string;
  version: number;
  schemaId: string;
  createdAt: Date;
}

/** Result of a compatibility check */
export interface CompatibilityResult {
  isCompatible: boolean;
  mode: CompatibilityMode;
  errors: string[];
}

/** Single validation error detail */
export interface ValidationError {
  field: string;
  message: string;
  expectedType?: string;
  actualValue?: unknown;
}

/** Result of validating an event against a schema */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

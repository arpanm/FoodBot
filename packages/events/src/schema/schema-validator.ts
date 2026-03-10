/**
 * Schema Validator for validating events against JSON schemas.
 *
 * Provides validation of event payloads against registered
 * or provided JSON schema definitions.
 */

import { SchemaRegistry } from './schema-registry';
import {
  JsonSchemaDefinition,
  JsonSchemaProperty,
  ValidationError,
  ValidationResult,
} from './schema.types';

/**
 * SchemaValidator validates event payloads against JSON schemas.
 */
export class SchemaValidator {
  constructor(private readonly registry?: SchemaRegistry) {}

  /**
   * Validate a payload against a JSON schema definition.
   */
  validate(
    event: Record<string, unknown>,
    schema: JsonSchemaDefinition
  ): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequiredFields(event, schema, errors);
    this.validatePropertyTypes(event, schema, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate an event payload by looking up its schema
   * from the registry using the event type as subject.
   */
  async validateEventType(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<ValidationResult> {
    if (!this.registry) {
      return {
        isValid: false,
        errors: [
          {
            field: '',
            message: 'No schema registry configured',
          },
        ],
      };
    }

    try {
      const schemaEntry = await this.registry.getSchema(eventType);
      return this.validate(payload, schemaEntry.schema);
    } catch {
      return {
        isValid: false,
        errors: [
          {
            field: '',
            message: `Schema not found for event type: ${eventType}`,
          },
        ],
      };
    }
  }

  /**
   * Validate that all required fields are present.
   */
  private validateRequiredFields(
    event: Record<string, unknown>,
    schema: JsonSchemaDefinition,
    errors: ValidationError[]
  ): void {
    const requiredFields = schema.required ?? [];

    for (const field of requiredFields) {
      if (!(field in event) || event[field] === undefined) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          expectedType: schema.properties[field]?.type,
        });
      }
    }
  }

  /**
   * Validate property types match the schema definition.
   */
  private validatePropertyTypes(
    event: Record<string, unknown>,
    schema: JsonSchemaDefinition,
    errors: ValidationError[]
  ): void {
    for (const [field, value] of Object.entries(event)) {
      const propertySchema = schema.properties[field];

      if (!propertySchema) {
        if (schema.additionalProperties === false) {
          errors.push({
            field,
            message: `Unknown field '${field}' is not allowed`,
            actualValue: value,
          });
        }
        continue;
      }

      this.validatePropertyType(field, value, propertySchema, errors);
    }
  }

  /**
   * Validate a single property value against its schema definition.
   */
  private validatePropertyType(
    field: string,
    value: unknown,
    propertySchema: JsonSchemaProperty,
    errors: ValidationError[]
  ): void {
    if (value === null || value === undefined) {
      return;
    }

    const actualType = this.getJsonType(value);
    if (actualType !== propertySchema.type) {
      errors.push({
        field,
        message: `Field '${field}' expected type '${propertySchema.type}' but got '${actualType}'`,
        expectedType: propertySchema.type,
        actualValue: value,
      });
      return;
    }

    if (propertySchema.enum && !propertySchema.enum.includes(String(value))) {
      errors.push({
        field,
        message: `Field '${field}' value '${String(value)}' is not in allowed values: ${propertySchema.enum.join(', ')}`,
        expectedType: propertySchema.type,
        actualValue: value,
      });
    }
  }

  /**
   * Map a JavaScript value to its JSON Schema type name.
   */
  private getJsonType(value: unknown): string {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value === null) {
      return 'null';
    }
    return typeof value;
  }
}

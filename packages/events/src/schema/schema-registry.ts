/**
 * In-memory Schema Registry for managing event schemas.
 *
 * Provides schema registration, retrieval, versioning,
 * and compatibility checking for event schemas.
 */

import {
  CompatibilityMode,
  CompatibilityResult,
  EventSchema,
  JsonSchemaDefinition,
  SchemaRegistration,
} from './schema.types';

/**
 * SchemaRegistry manages versioned event schemas in memory.
 * Supports registration, retrieval, and compatibility checking.
 */
export class SchemaRegistry {
  private readonly schemas: Map<string, EventSchema[]> = new Map();
  private readonly compatibilityModes: Map<string, CompatibilityMode> = new Map();
  private schemaIdCounter = 0;

  /**
   * Register a new schema version for a subject.
   */
  async registerSchema(
    subject: string,
    schema: JsonSchemaDefinition
  ): Promise<SchemaRegistration> {
    const existing = this.schemas.get(subject) ?? [];
    const nextVersion = existing.length + 1;

    if (existing.length > 0) {
      const compatResult = await this.checkCompatibility(subject, schema);
      if (!compatResult.isCompatible) {
        throw new SchemaRegistryError(
          `Schema is not compatible: ${compatResult.errors.join(', ')}`
        );
      }
    }

    const eventSchema: EventSchema = {
      subject,
      version: nextVersion,
      schema,
      createdAt: new Date(),
    };

    const updatedSchemas = [...existing, eventSchema];
    this.schemas.set(subject, updatedSchemas);

    this.schemaIdCounter += 1;
    const schemaId = `schema-${this.schemaIdCounter}`;

    return {
      subject,
      version: nextVersion,
      schemaId,
      createdAt: eventSchema.createdAt,
    };
  }

  /**
   * Retrieve a schema by subject and optional version.
   * Returns the latest version if no version is specified.
   */
  async getSchema(subject: string, version?: number): Promise<EventSchema> {
    const versions = this.schemas.get(subject);
    if (!versions || versions.length === 0) {
      throw new SchemaRegistryError(`No schema found for subject: ${subject}`);
    }

    if (version !== undefined) {
      const schema = versions.find((s) => s.version === version);
      if (!schema) {
        throw new SchemaRegistryError(
          `Version ${version} not found for subject: ${subject}`
        );
      }
      return schema;
    }

    const latest = versions[versions.length - 1];
    if (!latest) {
      throw new SchemaRegistryError(`No schema found for subject: ${subject}`);
    }
    return latest;
  }

  /**
   * Check if a new schema is compatible with the current latest
   * schema for a subject.
   */
  async checkCompatibility(
    subject: string,
    newSchema: JsonSchemaDefinition
  ): Promise<CompatibilityResult> {
    const mode = this.getCompatibilityMode(subject);

    if (mode === 'NONE') {
      return { isCompatible: true, mode, errors: [] };
    }

    const existing = this.schemas.get(subject);
    if (!existing || existing.length === 0) {
      return { isCompatible: true, mode, errors: [] };
    }

    const latestSchema = existing[existing.length - 1];
    if (!latestSchema) {
      return { isCompatible: true, mode, errors: [] };
    }

    const errors = this.performCompatibilityCheck(
      latestSchema.schema,
      newSchema,
      mode
    );

    return {
      isCompatible: errors.length === 0,
      mode,
      errors,
    };
  }

  /**
   * List all registered subjects.
   */
  listSubjects(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get all registered version numbers for a subject.
   */
  getVersions(subject: string): number[] {
    const versions = this.schemas.get(subject);
    if (!versions) {
      return [];
    }
    return versions.map((s) => s.version);
  }

  /**
   * Set the compatibility mode for a subject.
   */
  setCompatibilityMode(subject: string, mode: CompatibilityMode): void {
    this.compatibilityModes.set(subject, mode);
  }

  /**
   * Get the compatibility mode for a subject, defaults to BACKWARD.
   */
  getCompatibilityMode(subject: string): CompatibilityMode {
    return this.compatibilityModes.get(subject) ?? 'BACKWARD';
  }

  /**
   * Perform the actual compatibility check based on mode.
   */
  private performCompatibilityCheck(
    oldSchema: JsonSchemaDefinition,
    newSchema: JsonSchemaDefinition,
    mode: CompatibilityMode
  ): string[] {
    const errors: string[] = [];

    if (mode === 'BACKWARD' || mode === 'FULL') {
      errors.push(...this.checkBackwardCompatibility(oldSchema, newSchema));
    }

    if (mode === 'FORWARD' || mode === 'FULL') {
      errors.push(...this.checkForwardCompatibility(oldSchema, newSchema));
    }

    return errors;
  }

  /**
   * Check backward compatibility: new schema can read old data.
   * New required fields without defaults break backward compatibility.
   */
  private checkBackwardCompatibility(
    oldSchema: JsonSchemaDefinition,
    newSchema: JsonSchemaDefinition
  ): string[] {
    const errors: string[] = [];
    const oldRequired = new Set(oldSchema.required ?? []);
    const newRequired = new Set(newSchema.required ?? []);

    for (const field of newRequired) {
      if (!oldRequired.has(field) && !oldSchema.properties[field]) {
        errors.push(
          `Backward incompatible: new required field '${field}' not present in old schema`
        );
      }
    }

    return errors;
  }

  /**
   * Check forward compatibility: old schema can read new data.
   * Removing required fields breaks forward compatibility.
   */
  private checkForwardCompatibility(
    oldSchema: JsonSchemaDefinition,
    newSchema: JsonSchemaDefinition
  ): string[] {
    const errors: string[] = [];
    const oldRequired = new Set(oldSchema.required ?? []);

    for (const field of oldRequired) {
      if (!newSchema.properties[field]) {
        errors.push(
          `Forward incompatible: required field '${field}' was removed`
        );
      }
    }

    return errors;
  }
}

/**
 * Custom error for schema registry operations.
 */
export class SchemaRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaRegistryError';
  }
}

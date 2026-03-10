import { SchemaRegistry, SchemaRegistryError } from '../schema/schema-registry';
import { JsonSchemaDefinition } from '../schema/schema.types';

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  const sampleSchema: JsonSchemaDefinition = {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      userId: { type: 'string' },
      total: { type: 'number' },
    },
    required: ['orderId', 'userId', 'total'],
  };

  const compatibleSchema: JsonSchemaDefinition = {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      userId: { type: 'string' },
      total: { type: 'number' },
      notes: { type: 'string' },
    },
    required: ['orderId', 'userId', 'total'],
  };

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe('registerSchema', () => {
    it('should register a new schema for a subject', async () => {
      const result = await registry.registerSchema('order.created', sampleSchema);

      expect(result.subject).toBe('order.created');
      expect(result.version).toBe(1);
      expect(result.schemaId).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should increment version for subsequent registrations', async () => {
      await registry.registerSchema('order.created', sampleSchema);
      const result = await registry.registerSchema('order.created', compatibleSchema);

      expect(result.version).toBe(2);
    });

    it('should reject incompatible schemas in BACKWARD mode', async () => {
      await registry.registerSchema('order.created', sampleSchema);

      const incompatibleSchema: JsonSchemaDefinition = {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          userId: { type: 'string' },
          total: { type: 'number' },
          newRequiredField: { type: 'string' },
        },
        required: ['orderId', 'userId', 'total', 'newRequiredField'],
      };

      await expect(
        registry.registerSchema('order.created', incompatibleSchema)
      ).rejects.toThrow(SchemaRegistryError);
    });

    it('should allow incompatible schemas in NONE mode', async () => {
      registry.setCompatibilityMode('order.created', 'NONE');
      await registry.registerSchema('order.created', sampleSchema);

      const incompatibleSchema: JsonSchemaDefinition = {
        type: 'object',
        properties: {
          newField: { type: 'string' },
        },
        required: ['newField'],
      };

      const result = await registry.registerSchema('order.created', incompatibleSchema);
      expect(result.version).toBe(2);
    });
  });

  describe('getSchema', () => {
    it('should return the latest schema when no version specified', async () => {
      await registry.registerSchema('order.created', sampleSchema);
      await registry.registerSchema('order.created', compatibleSchema);

      const result = await registry.getSchema('order.created');

      expect(result.version).toBe(2);
      expect(result.schema).toEqual(compatibleSchema);
    });

    it('should return a specific version when requested', async () => {
      await registry.registerSchema('order.created', sampleSchema);
      await registry.registerSchema('order.created', compatibleSchema);

      const result = await registry.getSchema('order.created', 1);

      expect(result.version).toBe(1);
      expect(result.schema).toEqual(sampleSchema);
    });

    it('should throw when subject does not exist', async () => {
      await expect(registry.getSchema('nonexistent')).rejects.toThrow(
        SchemaRegistryError
      );
    });

    it('should throw when version does not exist', async () => {
      await registry.registerSchema('order.created', sampleSchema);

      await expect(registry.getSchema('order.created', 99)).rejects.toThrow(
        SchemaRegistryError
      );
    });
  });

  describe('checkCompatibility', () => {
    it('should return compatible for first schema', async () => {
      const result = await registry.checkCompatibility('order.created', sampleSchema);

      expect(result.isCompatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect backward incompatibility', async () => {
      await registry.registerSchema('order.created', sampleSchema);

      const incompatible: JsonSchemaDefinition = {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          userId: { type: 'string' },
          total: { type: 'number' },
          mandatory: { type: 'string' },
        },
        required: ['orderId', 'userId', 'total', 'mandatory'],
      };

      const result = await registry.checkCompatibility('order.created', incompatible);

      expect(result.isCompatible).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect forward incompatibility', async () => {
      registry.setCompatibilityMode('order.created', 'FORWARD');
      await registry.registerSchema('order.created', sampleSchema);

      const incompatible: JsonSchemaDefinition = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          total: { type: 'number' },
        },
        required: ['userId', 'total'],
      };

      const result = await registry.checkCompatibility('order.created', incompatible);

      expect(result.isCompatible).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check both directions in FULL mode', async () => {
      registry.setCompatibilityMode('order.created', 'FULL');
      await registry.registerSchema('order.created', sampleSchema);

      const result = await registry.checkCompatibility('order.created', compatibleSchema);

      expect(result.isCompatible).toBe(true);
      expect(result.mode).toBe('FULL');
    });
  });

  describe('listSubjects', () => {
    it('should return empty list initially', () => {
      expect(registry.listSubjects()).toEqual([]);
    });

    it('should return all registered subjects', async () => {
      await registry.registerSchema('order.created', sampleSchema);
      await registry.registerSchema('order.updated', sampleSchema);

      const subjects = registry.listSubjects();

      expect(subjects).toContain('order.created');
      expect(subjects).toContain('order.updated');
      expect(subjects).toHaveLength(2);
    });
  });

  describe('getVersions', () => {
    it('should return empty list for unknown subject', () => {
      expect(registry.getVersions('unknown')).toEqual([]);
    });

    it('should return all version numbers', async () => {
      await registry.registerSchema('order.created', sampleSchema);
      await registry.registerSchema('order.created', compatibleSchema);

      const versions = registry.getVersions('order.created');

      expect(versions).toEqual([1, 2]);
    });
  });

  describe('compatibility modes', () => {
    it('should default to BACKWARD mode', () => {
      expect(registry.getCompatibilityMode('order.created')).toBe('BACKWARD');
    });

    it('should allow setting custom mode', () => {
      registry.setCompatibilityMode('order.created', 'FULL');
      expect(registry.getCompatibilityMode('order.created')).toBe('FULL');
    });
  });
});

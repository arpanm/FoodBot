import { NodeType, RelationshipType } from '../types/graph.types';
import { GraphService } from './graph-service';

export interface SchemaConstraint {
  label: NodeType;
  property: string;
  type: 'unique';
}

export interface SchemaIndex {
  label: NodeType | RelationshipType;
  properties: string[];
  type: 'node' | 'relationship';
}

const NODE_CONSTRAINTS: SchemaConstraint[] = [
  { label: NodeType.USER, property: 'userId', type: 'unique' },
  { label: NodeType.RESTAURANT, property: 'restaurantId', type: 'unique' },
  { label: NodeType.DISH, property: 'dishId', type: 'unique' },
  { label: NodeType.CATEGORY, property: 'categoryId', type: 'unique' },
  { label: NodeType.DAY_OF_WEEK, property: 'day', type: 'unique' },
  { label: NodeType.TIME_SLOT, property: 'slot', type: 'unique' },
];

const SCHEMA_INDEXES: SchemaIndex[] = [
  { label: NodeType.RESTAURANT, properties: ['latitude', 'longitude'], type: 'node' },
  { label: NodeType.DISH, properties: ['cuisine'], type: 'node' },
  { label: NodeType.DISH, properties: ['restaurantId'], type: 'node' },
];

export class SchemaManager {
  private constraints: SchemaConstraint[] = [];
  private indexes: SchemaIndex[] = [];

  constructor(private readonly _graph: GraphService) {}

  initializeSchema(): void {
    this.createConstraints();
    this.createIndexes();
    this.createTimeNodes();
  }

  getConstraints(): SchemaConstraint[] {
    return [...this.constraints];
  }

  getIndexes(): SchemaIndex[] {
    return [...this.indexes];
  }

  private createConstraints(): void {
    for (const constraint of NODE_CONSTRAINTS) {
      this.constraints.push({ ...constraint });
    }
  }

  private createIndexes(): void {
    for (const index of SCHEMA_INDEXES) {
      this.indexes.push({ ...index });
    }
  }

  private createTimeNodes(): void {
    this.createDayOfWeekNodes();
    this.createTimeSlotNodes();
  }

  private createDayOfWeekNodes(): void {
    const days = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday',
    ];
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day) {
        this._graph.addNode({
          id: `day-${day.toLowerCase()}`,
          label: NodeType.DAY_OF_WEEK,
          properties: { day, dayIndex: i },
        });
      }
    }
  }

  private createTimeSlotNodes(): void {
    const slots = [
      { slot: 'breakfast', startHour: 6, endHour: 11 },
      { slot: 'lunch', startHour: 11, endHour: 15 },
      { slot: 'snack', startHour: 15, endHour: 18 },
      { slot: 'dinner', startHour: 18, endHour: 22 },
      { slot: 'late-night', startHour: 22, endHour: 6 },
    ];
    for (const slotDef of slots) {
      this._graph.addNode({
        id: `timeslot-${slotDef.slot}`,
        label: NodeType.TIME_SLOT,
        properties: {
          slot: slotDef.slot,
          startHour: slotDef.startHour,
          endHour: slotDef.endHour,
        },
      });
    }
  }
}

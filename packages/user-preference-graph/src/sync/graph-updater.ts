import { GraphService } from '../graph/graph-service';
import { RelationshipType } from '../types/graph.types';
import { OrderHistoryRecord } from '../types/preference.types';
import { OrderHistoryImporter } from '../preference/order-history-importer';

export interface UpdateResult {
  relationshipsUpdated: number;
  nodesCreated: number;
}

export class GraphUpdater {
  private readonly importer: OrderHistoryImporter;

  constructor(private readonly graph: GraphService) {
    this.importer = new OrderHistoryImporter(graph);
  }

  onOrderCompleted(userId: string, order: OrderHistoryRecord): UpdateResult {
    const importResult = this.importer.importOrders(userId, [order]);

    this.incrementWeights(userId, order);

    return {
      relationshipsUpdated: importResult.relationshipsCreated,
      nodesCreated: importResult.nodesCreated,
    };
  }

  incrementWeights(userId: string, order: OrderHistoryRecord): void {
    this.updateFrequentsWeight(userId, order);
    this.updateTimeRelationships(userId, order);
    this.updateCategoryWeights(userId, order);
  }

  private updateFrequentsWeight(userId: string, order: OrderHistoryRecord): void {
    const relId = `frequents-${userId}-${order.restaurantId}`;
    const existing = this.graph.getRelationship(relId);
    if (!existing) {
      return;
    }
    const currentCount = (existing.properties['orderCount'] as number) ?? 1;
    const currentWeight = (existing.properties['weight'] as number) ?? 0.5;
    const newWeight = Math.min(currentWeight + 0.05, 1.0);

    this.graph.updateRelationshipProperties(relId, {
      weight: newWeight,
      orderCount: currentCount + 1,
      lastUpdated: order.orderDate,
    });
  }

  private updateTimeRelationships(userId: string, order: OrderHistoryRecord): void {
    this.incrementTimeRelationship(
      `orderson-${userId}-${order.dayOfWeek.toLowerCase()}`,
      order.orderDate
    );
    this.incrementTimeRelationship(
      `ordersat-${userId}-${order.timeSlot}`,
      order.orderDate
    );
  }

  private incrementTimeRelationship(relId: string, orderDate: string): void {
    const existing = this.graph.getRelationship(relId);
    if (!existing) {
      return;
    }
    const count = ((existing.properties['count'] as number) ?? 0) + 1;
    this.graph.updateRelationshipProperties(relId, {
      count,
      lastUpdated: orderDate,
    });
  }

  private updateCategoryWeights(userId: string, order: OrderHistoryRecord): void {
    for (const item of order.items) {
      this.incrementCategoryWeight(userId, item.categoryId);
      this.incrementDishWeight(userId, item.dishId, order.orderDate);
    }
  }

  private incrementCategoryWeight(userId: string, categoryId: string): void {
    const relId = `likescat-${userId}-${categoryId}`;
    const existing = this.graph.getRelationship(relId);
    if (!existing) {
      return;
    }
    const currentWeight = (existing.properties['weight'] as number) ?? 0.5;
    const orderCount = ((existing.properties['orderCount'] as number) ?? 1) + 1;
    const newWeight = Math.min(currentWeight + 0.03, 1.0);

    this.graph.updateRelationshipProperties(relId, {
      weight: newWeight,
      orderCount,
    });
  }

  private incrementDishWeight(userId: string, dishId: string, orderDate: string): void {
    const relId = `favdish-${userId}-${dishId}`;
    const existing = this.graph.getRelationship(relId);
    if (!existing) {
      return;
    }
    const currentWeight = (existing.properties['weight'] as number) ?? 0.5;
    const orderCount = ((existing.properties['orderCount'] as number) ?? 1) + 1;
    const newWeight = Math.min(currentWeight + 0.05, 1.0);

    this.graph.updateRelationshipProperties(relId, {
      weight: newWeight,
      orderCount,
      lastUpdated: orderDate,
    });
  }
}

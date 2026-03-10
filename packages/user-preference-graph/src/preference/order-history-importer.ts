import { GraphService } from '../graph/graph-service';
import {
  RelationshipType,
  GraphRelationship,
} from '../types/graph.types';
import { OrderHistoryRecord, OrderItemRecord } from '../types/preference.types';
import { NodeFactory } from './node-factory';
import { WeightCalculator } from './weight-calculator';

export interface ImportResult {
  nodesCreated: number;
  relationshipsCreated: number;
}

export class OrderHistoryImporter {
  private readonly calculator: WeightCalculator;
  private readonly nodeFactory: NodeFactory;

  constructor(private readonly graph: GraphService) {
    this.calculator = new WeightCalculator();
    this.nodeFactory = new NodeFactory(graph);
  }

  importOrders(userId: string, orders: OrderHistoryRecord[]): ImportResult {
    let nodesCreated = 0;
    let relationshipsCreated = 0;

    nodesCreated += this.nodeFactory.ensureUserNode(userId, orders);
    const maxOrders = orders.length;

    for (const order of orders) {
      const orderResult = this.importSingleOrder(userId, order, maxOrders, orders);
      nodesCreated += orderResult.nodesCreated;
      relationshipsCreated += orderResult.relationshipsCreated;
    }

    return { nodesCreated, relationshipsCreated };
  }

  private importSingleOrder(
    userId: string,
    order: OrderHistoryRecord,
    maxOrders: number,
    allOrders: OrderHistoryRecord[]
  ): ImportResult {
    let nodesCreated = 0;
    let relationshipsCreated = 0;

    nodesCreated += this.nodeFactory.ensureRestaurantNode(order);
    relationshipsCreated += this.createFrequentsRelationship(
      userId, order, maxOrders, allOrders
    );
    relationshipsCreated += this.createTimeRelationships(userId, order);

    for (const item of order.items) {
      nodesCreated += this.nodeFactory.ensureDishNode(item, order.restaurantId);
      nodesCreated += this.nodeFactory.ensureCategoryNode(item);
      relationshipsCreated += this.createDishRelationship(userId, item, order);
      relationshipsCreated += this.createCategoryRelationship(userId, item, allOrders);
      relationshipsCreated += this.createServedAtRelationship(item, order.restaurantId);
      relationshipsCreated += this.createBelongsToRelationship(item);
    }

    return { nodesCreated, relationshipsCreated };
  }

  private createFrequentsRelationship(
    userId: string,
    order: OrderHistoryRecord,
    maxOrders: number,
    allOrders: OrderHistoryRecord[]
  ): number {
    const relId = `frequents-${userId}-${order.restaurantId}`;
    if (this.graph.getRelationship(relId)) {
      this.updateFrequentsWeight(relId, userId, order.restaurantId, allOrders, maxOrders);
      return 0;
    }
    const orderCount = this.countOrdersAtRestaurant(userId, order.restaurantId, allOrders);
    const weight = this.computeWeight(orderCount, maxOrders, order);
    this.graph.addRelationship(this.buildRelationship(
      relId, `user-${userId}`, `restaurant-${order.restaurantId}`,
      RelationshipType.FREQUENTS, weight, order.orderDate, orderCount
    ));
    return 1;
  }

  private updateFrequentsWeight(
    relId: string,
    userId: string,
    restaurantId: string,
    allOrders: OrderHistoryRecord[],
    maxOrders: number
  ): void {
    const orderCount = this.countOrdersAtRestaurant(userId, restaurantId, allOrders);
    const latestOrder = this.getLatestOrderAtRestaurant(restaurantId, allOrders);
    if (!latestOrder) {
      return;
    }
    const weight = this.computeWeight(orderCount, maxOrders, latestOrder);
    this.graph.updateRelationshipProperties(relId, {
      weight,
      orderCount,
      lastUpdated: latestOrder.orderDate,
    });
  }

  private createTimeRelationships(userId: string, order: OrderHistoryRecord): number {
    let created = 0;
    created += this.createSingleTimeRelationship(
      `orderson-${userId}-${order.dayOfWeek.toLowerCase()}`,
      `user-${userId}`,
      `day-${order.dayOfWeek.toLowerCase()}`,
      RelationshipType.ORDERS_ON,
      order.orderDate
    );
    created += this.createSingleTimeRelationship(
      `ordersat-${userId}-${order.timeSlot}`,
      `user-${userId}`,
      `timeslot-${order.timeSlot}`,
      RelationshipType.ORDERS_AT,
      order.orderDate
    );
    return created;
  }

  private createSingleTimeRelationship(
    relId: string,
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    orderDate: string
  ): number {
    if (this.graph.getRelationship(relId)) {
      const existing = this.graph.getRelationship(relId);
      const count = ((existing?.properties['count'] as number) ?? 0) + 1;
      this.graph.updateRelationshipProperties(relId, { count, lastUpdated: orderDate });
      return 0;
    }
    this.graph.addRelationship({
      id: relId,
      sourceId,
      targetId,
      type,
      properties: { count: 1, weight: 1.0, lastUpdated: orderDate },
    });
    return 1;
  }

  private createDishRelationship(
    userId: string,
    item: OrderItemRecord,
    order: OrderHistoryRecord
  ): number {
    const relId = `favdish-${userId}-${item.dishId}`;
    if (this.graph.getRelationship(relId)) {
      const existing = this.graph.getRelationship(relId);
      const count = ((existing?.properties['orderCount'] as number) ?? 0) + 1;
      this.graph.updateRelationshipProperties(relId, {
        orderCount: count,
        lastUpdated: order.orderDate,
      });
      return 0;
    }
    this.graph.addRelationship({
      id: relId,
      sourceId: `user-${userId}`,
      targetId: `dish-${item.dishId}`,
      type: RelationshipType.FAVORITE_DISH,
      properties: { weight: 0.5, orderCount: 1, lastUpdated: order.orderDate },
    });
    return 1;
  }

  private createCategoryRelationship(
    userId: string,
    item: OrderItemRecord,
    _allOrders: OrderHistoryRecord[]
  ): number {
    const relId = `likescat-${userId}-${item.categoryId}`;
    if (this.graph.getRelationship(relId)) {
      const existing = this.graph.getRelationship(relId);
      const count = ((existing?.properties['orderCount'] as number) ?? 0) + 1;
      this.graph.updateRelationshipProperties(relId, { orderCount: count });
      return 0;
    }
    this.graph.addRelationship({
      id: relId,
      sourceId: `user-${userId}`,
      targetId: `category-${item.categoryId}`,
      type: RelationshipType.LIKES_CATEGORY,
      properties: { weight: 0.5, orderCount: 1, lastUpdated: new Date().toISOString() },
    });
    return 1;
  }

  private createServedAtRelationship(
    item: OrderItemRecord,
    restaurantId: string
  ): number {
    const relId = `servedat-${item.dishId}-${restaurantId}`;
    if (this.graph.getRelationship(relId)) {
      return 0;
    }
    this.graph.addRelationship({
      id: relId,
      sourceId: `dish-${item.dishId}`,
      targetId: `restaurant-${restaurantId}`,
      type: RelationshipType.SERVED_AT,
      properties: { lastUpdated: new Date().toISOString() },
    });
    return 1;
  }

  private createBelongsToRelationship(item: OrderItemRecord): number {
    const relId = `belongsto-${item.dishId}-${item.categoryId}`;
    if (this.graph.getRelationship(relId)) {
      return 0;
    }
    this.graph.addRelationship({
      id: relId,
      sourceId: `dish-${item.dishId}`,
      targetId: `category-${item.categoryId}`,
      type: RelationshipType.BELONGS_TO,
      properties: { lastUpdated: new Date().toISOString() },
    });
    return 1;
  }

  private computeWeight(
    orderCount: number,
    maxOrders: number,
    order: OrderHistoryRecord
  ): number {
    const daysSince = this.daysSince(order.orderDate);
    return this.calculator.computeFullWeight(
      orderCount, maxOrders, daysSince, order.rating, false, false
    );
  }

  private countOrdersAtRestaurant(
    _userId: string,
    restaurantId: string,
    allOrders: OrderHistoryRecord[]
  ): number {
    return allOrders.filter((o) => o.restaurantId === restaurantId).length;
  }

  private getLatestOrderAtRestaurant(
    restaurantId: string,
    allOrders: OrderHistoryRecord[]
  ): OrderHistoryRecord | undefined {
    const filtered = allOrders.filter((o) => o.restaurantId === restaurantId);
    return filtered.sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    )[0];
  }

  private daysSince(dateStr: string): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs(new Date().getTime() - new Date(dateStr).getTime()) / msPerDay;
  }

  private buildRelationship(
    id: string,
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    weight: number,
    lastUpdated: string,
    orderCount: number
  ): GraphRelationship {
    return {
      id,
      sourceId,
      targetId,
      type,
      properties: { weight, orderCount, lastUpdated },
    };
  }
}

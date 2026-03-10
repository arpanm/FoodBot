import { GraphService } from '../graph/graph-service';
import { NodeType } from '../types/graph.types';
import { OrderHistoryRecord, OrderItemRecord } from '../types/preference.types';

export class NodeFactory {
  constructor(private readonly graph: GraphService) {}

  ensureUserNode(userId: string, orders: OrderHistoryRecord[]): number {
    if (this.graph.getNode(`user-${userId}`)) {
      return 0;
    }
    const name = orders.length > 0 ? (orders[0]?.userId ?? userId) : userId;
    this.graph.addNode({
      id: `user-${userId}`,
      label: NodeType.USER,
      properties: {
        userId,
        name,
        latitude: null,
        longitude: null,
        createdAt: new Date().toISOString(),
      },
    });
    return 1;
  }

  ensureRestaurantNode(order: OrderHistoryRecord): number {
    const nodeId = `restaurant-${order.restaurantId}`;
    if (this.graph.getNode(nodeId)) {
      return 0;
    }
    this.graph.addNode({
      id: nodeId,
      label: NodeType.RESTAURANT,
      properties: {
        restaurantId: order.restaurantId,
        name: order.restaurantName,
        latitude: order.restaurantLatitude,
        longitude: order.restaurantLongitude,
        cuisine: order.restaurantCuisine,
        rating: order.restaurantRating,
      },
    });
    return 1;
  }

  ensureDishNode(item: OrderItemRecord, restaurantId: string): number {
    const nodeId = `dish-${item.dishId}`;
    if (this.graph.getNode(nodeId)) {
      return 0;
    }
    this.graph.addNode({
      id: nodeId,
      label: NodeType.DISH,
      properties: {
        dishId: item.dishId,
        name: item.dishName,
        price: item.price,
        cuisine: item.cuisine,
        isVegetarian: item.isVegetarian,
        restaurantId,
      },
    });
    return 1;
  }

  ensureCategoryNode(item: OrderItemRecord): number {
    const nodeId = `category-${item.categoryId}`;
    if (this.graph.getNode(nodeId)) {
      return 0;
    }
    this.graph.addNode({
      id: nodeId,
      label: NodeType.CATEGORY,
      properties: {
        categoryId: item.categoryId,
        name: item.categoryName,
      },
    });
    return 1;
  }
}

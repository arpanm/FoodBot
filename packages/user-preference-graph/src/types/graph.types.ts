export enum NodeType {
  USER = 'USER',
  RESTAURANT = 'RESTAURANT',
  DISH = 'DISH',
  CATEGORY = 'CATEGORY',
  DAY_OF_WEEK = 'DAY_OF_WEEK',
  TIME_SLOT = 'TIME_SLOT',
}

export enum RelationshipType {
  FREQUENTS = 'FREQUENTS',
  FAVORITE_DISH = 'FAVORITE_DISH',
  ORDERS_ON = 'ORDERS_ON',
  ORDERS_AT = 'ORDERS_AT',
  LIKES_CATEGORY = 'LIKES_CATEGORY',
  DISLIKES_CATEGORY = 'DISLIKES_CATEGORY',
  BELONGS_TO = 'BELONGS_TO',
  SERVED_AT = 'SERVED_AT',
  SIMILAR_TO = 'SIMILAR_TO',
}

export interface GraphNode {
  id: string;
  label: NodeType;
  properties: Record<string, string | number | boolean | null>;
}

export interface UserNode extends GraphNode {
  label: NodeType.USER;
  properties: {
    userId: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    createdAt: string;
  };
}

export interface RestaurantNode extends GraphNode {
  label: NodeType.RESTAURANT;
  properties: {
    restaurantId: string;
    name: string;
    latitude: number;
    longitude: number;
    cuisine: string;
    rating: number;
  };
}

export interface DishNode extends GraphNode {
  label: NodeType.DISH;
  properties: {
    dishId: string;
    name: string;
    price: number;
    cuisine: string;
    isVegetarian: boolean;
    restaurantId: string;
  };
}

export interface CategoryNode extends GraphNode {
  label: NodeType.CATEGORY;
  properties: {
    categoryId: string;
    name: string;
  };
}

export interface DayOfWeekNode extends GraphNode {
  label: NodeType.DAY_OF_WEEK;
  properties: {
    day: string;
    dayIndex: number;
  };
}

export interface TimeSlotNode extends GraphNode {
  label: NodeType.TIME_SLOT;
  properties: {
    slot: string;
    startHour: number;
    endHour: number;
  };
}

export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  properties: Record<string, string | number | boolean | null>;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface NeighborQuery {
  nodeId: string;
  relationshipType?: RelationshipType;
  direction?: 'outgoing' | 'incoming' | 'both';
  limit?: number;
}

export interface GeoDistanceQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  nodeLabel?: NodeType;
}

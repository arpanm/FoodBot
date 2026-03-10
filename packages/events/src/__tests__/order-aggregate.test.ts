import { OrderAggregate } from '../sourcing/order-aggregate';
import { OrderEvent, StoredEvent } from '../sourcing/sourcing.types';

describe('OrderAggregate', () => {
  let aggregate: OrderAggregate;

  const createOrderEvent: OrderEvent = {
    type: 'OrderCreated',
    orderId: 'order-1',
    userId: 'user-1',
    restaurantId: 'rest-1',
    items: [
      { dishId: 'dish-1', dishName: 'Burger', quantity: 2, price: 10 },
      { dishId: 'dish-2', dishName: 'Fries', quantity: 1, price: 5 },
    ],
    total: 25,
  };

  beforeEach(() => {
    aggregate = new OrderAggregate();
  });

  describe('apply', () => {
    it('should apply OrderCreated event', () => {
      aggregate.apply(createOrderEvent);
      const state = aggregate.getState();

      expect(state.orderId).toBe('order-1');
      expect(state.userId).toBe('user-1');
      expect(state.restaurantId).toBe('rest-1');
      expect(state.items).toHaveLength(2);
      expect(state.total).toBe(25);
      expect(state.status).toBe('created');
      expect(state.createdAt).toBeInstanceOf(Date);
    });

    it('should apply OrderConfirmed event', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderConfirmed',
        orderId: 'order-1',
        confirmedAt: new Date(),
      });

      const state = aggregate.getState();
      expect(state.status).toBe('confirmed');
    });

    it('should apply OrderPreparing event', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderPreparing',
        orderId: 'order-1',
        estimatedReadyTime: new Date(),
      });

      const state = aggregate.getState();
      expect(state.status).toBe('preparing');
    });

    it('should apply OrderReady event', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderReady',
        orderId: 'order-1',
        readyAt: new Date(),
      });

      const state = aggregate.getState();
      expect(state.status).toBe('ready');
    });

    it('should apply OrderDelivered event', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderDelivered',
        orderId: 'order-1',
        deliveredAt: new Date(),
      });

      const state = aggregate.getState();
      expect(state.status).toBe('delivered');
    });

    it('should apply OrderCancelled event with reason', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderCancelled',
        orderId: 'order-1',
        reason: 'Customer request',
        cancelledAt: new Date(),
      });

      const state = aggregate.getState();
      expect(state.status).toBe('cancelled');
      expect(state.cancelReason).toBe('Customer request');
    });

    it('should track full lifecycle through events', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderConfirmed',
        orderId: 'order-1',
        confirmedAt: new Date(),
      });
      aggregate.apply({
        type: 'OrderPreparing',
        orderId: 'order-1',
        estimatedReadyTime: new Date(),
      });
      aggregate.apply({
        type: 'OrderReady',
        orderId: 'order-1',
        readyAt: new Date(),
      });
      aggregate.apply({
        type: 'OrderDelivered',
        orderId: 'order-1',
        deliveredAt: new Date(),
      });

      const state = aggregate.getState();
      expect(state.status).toBe('delivered');
      expect(state.orderId).toBe('order-1');
      expect(state.total).toBe(25);
    });
  });

  describe('getState', () => {
    it('should return initial empty state', () => {
      const state = aggregate.getState();

      expect(state.orderId).toBe('');
      expect(state.items).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.status).toBe('created');
      expect(state.createdAt).toBeNull();
    });

    it('should return a copy of the state', () => {
      aggregate.apply(createOrderEvent);
      const state1 = aggregate.getState();
      const state2 = aggregate.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('rebuild', () => {
    it('should rebuild state from stored events', () => {
      const storedEvents: StoredEvent[] = [
        {
          aggregateId: 'order-1',
          version: 1,
          eventType: 'OrderCreated',
          data: {
            orderId: 'order-1',
            userId: 'user-1',
            restaurantId: 'rest-1',
            items: [{ dishId: 'dish-1', dishName: 'Burger', quantity: 2, price: 10 }],
            total: 20,
          },
          timestamp: new Date(),
        },
        {
          aggregateId: 'order-1',
          version: 2,
          eventType: 'OrderConfirmed',
          data: {
            orderId: 'order-1',
            confirmedAt: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
        {
          aggregateId: 'order-1',
          version: 3,
          eventType: 'OrderPreparing',
          data: {
            orderId: 'order-1',
            estimatedReadyTime: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      ];

      const state = aggregate.rebuild(storedEvents);

      expect(state.orderId).toBe('order-1');
      expect(state.status).toBe('preparing');
      expect(state.items).toHaveLength(1);
    });

    it('should reset state before rebuilding', () => {
      aggregate.apply(createOrderEvent);
      aggregate.apply({
        type: 'OrderDelivered',
        orderId: 'order-1',
        deliveredAt: new Date(),
      });

      const storedEvents: StoredEvent[] = [
        {
          aggregateId: 'order-2',
          version: 1,
          eventType: 'OrderCreated',
          data: {
            orderId: 'order-2',
            userId: 'user-2',
            restaurantId: 'rest-2',
            items: [],
            total: 50,
          },
          timestamp: new Date(),
        },
      ];

      const state = aggregate.rebuild(storedEvents);

      expect(state.orderId).toBe('order-2');
      expect(state.status).toBe('created');
    });

    it('should skip unknown event types', () => {
      const storedEvents: StoredEvent[] = [
        {
          aggregateId: 'order-1',
          version: 1,
          eventType: 'OrderCreated',
          data: {
            orderId: 'order-1',
            userId: 'user-1',
            restaurantId: 'rest-1',
            items: [],
            total: 10,
          },
          timestamp: new Date(),
        },
        {
          aggregateId: 'order-1',
          version: 2,
          eventType: 'UnknownEvent',
          data: { foo: 'bar' },
          timestamp: new Date(),
        },
      ];

      const state = aggregate.rebuild(storedEvents);

      expect(state.orderId).toBe('order-1');
      expect(state.status).toBe('created');
    });
  });

  describe('rebuildFromSnapshot', () => {
    it('should rebuild from snapshot and subsequent events', () => {
      const snapshotState = {
        orderId: 'order-1',
        userId: 'user-1',
        restaurantId: 'rest-1',
        items: [{ dishId: 'dish-1', dishName: 'Burger', quantity: 1, price: 10 }],
        total: 10,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const subsequentEvents: StoredEvent[] = [
        {
          aggregateId: 'order-1',
          version: 6,
          eventType: 'OrderPreparing',
          data: {
            orderId: 'order-1',
            estimatedReadyTime: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
        {
          aggregateId: 'order-1',
          version: 7,
          eventType: 'OrderReady',
          data: {
            orderId: 'order-1',
            readyAt: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      ];

      const state = aggregate.rebuildFromSnapshot(snapshotState, subsequentEvents);

      expect(state.orderId).toBe('order-1');
      expect(state.status).toBe('ready');
      expect(state.total).toBe(10);
    });
  });
});

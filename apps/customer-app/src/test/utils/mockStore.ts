import type { EnhancedStore } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';

import type {
  ChatState,
  RestaurantState,
  DishState,
  CartState,
  OrderState,
  UserState,
  AccountLinkingState,
} from '../../types/redux.types';

/**
 * Mock Redux store configuration for testing
 */
export interface MockStoreState {
  chat?: Partial<ChatState>;
  restaurant?: Partial<RestaurantState>;
  dish?: Partial<DishState>;
  cart?: Partial<CartState>;
  order?: Partial<OrderState>;
  user?: Partial<UserState>;
  accountLinking?: Partial<AccountLinkingState>;
}

/**
 * Creates a mock Redux store with provided initial state
 * @param initialState - Initial state for the store
 * @returns Configured Redux store for testing
 */
export function mockStore(initialState: MockStoreState = {}): EnhancedStore {
  const defaultState: MockStoreState = {
    chat: {
      messages: [],
      loading: false,
      error: null,
      ...initialState.chat,
    },
    restaurant: {
      restaurants: [],
      selectedRestaurant: null,
      loading: false,
      error: null,
      ...initialState.restaurant,
    },
    dish: {
      dishes: [],
      selectedDish: null,
      loading: false,
      error: null,
      ...initialState.dish,
    },
    cart: {
      items: [],
      total: 0,
      loading: false,
      error: null,
      ...initialState.cart,
    },
    order: {
      orders: [],
      activeOrder: null,
      loading: false,
      error: null,
      ...initialState.order,
    },
    user: {
      currentUser: null,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      addresses: [],
      loading: false,
      error: null,
      ...initialState.user,
    },
    accountLinking: {
      accounts: [],
      loading: false,
      error: null,
      oauthInProgress: null,
      oauthUrl: null,
      oauthState: null,
      unlinkingPlatform: null,
      lastFetchedAt: null,
      ...initialState.accountLinking,
    },
  };

  return configureStore({
    reducer: {
      chat: (state = defaultState.chat) => state,
      restaurant: (state = defaultState.restaurant) => state,
      dish: (state = defaultState.dish) => state,
      cart: (state = defaultState.cart) => state,
      order: (state = defaultState.order) => state,
      user: (state = defaultState.user) => state,
      accountLinking: (state = defaultState.accountLinking) => state,
    },
    preloadedState: defaultState,
  });
}

/**
 * Creates a mock store with actions tracking
 * @param initialState - Initial state for the store
 * @returns Store with getActions method
 */
export function mockStoreWithActions(
  initialState: MockStoreState = {}
): EnhancedStore & { getActions: () => unknown[] } {
  const actions: unknown[] = [];
  const store = mockStore(initialState);

  const originalDispatch = store.dispatch;
  store.dispatch = ((action: unknown) => {
    actions.push(action);
    return originalDispatch(action as any);
  }) as typeof store.dispatch;

  return {
    ...store,
    getActions: () => actions,
  };
}

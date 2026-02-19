import { configureStore } from '@reduxjs/toolkit';

import accountLinkingReducer from './slices/accountLinkingSlice';
import cartReducer from './slices/cartSlice';
import chatReducer from './slices/chatSlice';
import dishReducer from './slices/dishSlice';
import orderReducer from './slices/orderSlice';
import restaurantReducer from './slices/restaurantSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    restaurant: restaurantReducer,
    dish: dishReducer,
    cart: cartReducer,
    order: orderReducer,
    user: userReducer,
    accountLinking: accountLinkingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

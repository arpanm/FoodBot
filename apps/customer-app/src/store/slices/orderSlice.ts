import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { orderService } from '../../services/order.service';
import { Order } from '../../types/models';
import { CreateOrderRequest } from '../../types/api.types';

interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  activeOrder: null,
  loading: false,
  error: null,
};

export const fetchOrders = createAsyncThunk(
  'order/fetchAll',
  async () => {
    const response = await orderService.getAll();
    return response;
  }
);

export const fetchOrderById = createAsyncThunk(
  'order/fetchById',
  async (id: string) => {
    const response = await orderService.getById(id);
    return response;
  }
);

export const placeOrder = createAsyncThunk(
  'order/place',
  async (orderData: CreateOrderRequest) => {
    const response = await orderService.place(orderData);
    return response;
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setActiveOrder: (state, action: PayloadAction<Order | null>) => {
      state.activeOrder = action.payload;
    },
    updateOrderStatus: (state, action: PayloadAction<{ id: string; status: Order['status'] }>) => {
      const order = state.orders.find((o) => o.id === action.payload.id);
      if (order) {
        order.status = action.payload.status;
      }
      if (state.activeOrder?.id === action.payload.id) {
        state.activeOrder.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      .addCase(placeOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.activeOrder = action.payload;
        state.orders.push(action.payload);
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to place order';
      });
  },
});

export const { setActiveOrder, updateOrderStatus } = orderSlice.actions;
export default orderSlice.reducer;

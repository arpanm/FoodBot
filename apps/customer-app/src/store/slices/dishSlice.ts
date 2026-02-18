import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { dishService } from '../../services/dish.service';
import type { Dish } from '../../types/models';

interface DishState {
  dishes: Dish[];
  selectedDish: Dish | null;
  loading: boolean;
  error: string | null;
}

const initialState: DishState = {
  dishes: [],
  selectedDish: null,
  loading: false,
  error: null,
};

export const fetchDishes = createAsyncThunk(
  'dish/fetchAll',
  async (restaurantId: string) => {
    const response = await dishService.getByRestaurant(restaurantId);
    return response;
  }
);

export const fetchDishById = createAsyncThunk(
  'dish/fetchById',
  async (id: string) => {
    const response = await dishService.getById(id);
    return response;
  }
);

const dishSlice = createSlice({
  name: 'dish',
  initialState,
  reducers: {
    selectDish: (state, action: PayloadAction<Dish | null>) => {
      state.selectedDish = action.payload;
    },
    clearDishes: (state) => {
      state.dishes = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDishes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDishes.fulfilled, (state, action) => {
        state.loading = false;
        state.dishes = action.payload;
      })
      .addCase(fetchDishes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dishes';
      })
      .addCase(fetchDishById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDishById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDish = action.payload;
      })
      .addCase(fetchDishById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dish';
      });
  },
});

export const { selectDish, clearDishes } = dishSlice.actions;
export default dishSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userService } from '../../services/user.service';
import { User, UserPreferences, Address } from '../../types/models';

interface UserState {
  currentUser: User | null;
  preferences: UserPreferences;
  addresses: Address[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
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
};

export const fetchUser = createAsyncThunk(
  'user/fetch',
  async () => {
    const response = await userService.getCurrentUser();
    return response;
  }
);

export const updatePreferences = createAsyncThunk(
  'user/updatePreferences',
  async (preferences: Partial<UserPreferences>) => {
    const response = await userService.updatePreferences(preferences);
    return response;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.preferences = {
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      };
      state.addresses = [];
    },
    setAddresses: (state, action: PayloadAction<Address[]>) => {
      state.addresses = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.preferences = action.payload.preferences;
        state.addresses = action.payload.addresses;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user';
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      });
  },
});

export const { setUser, clearUser, setAddresses } = userSlice.actions;
export default userSlice.reducer;

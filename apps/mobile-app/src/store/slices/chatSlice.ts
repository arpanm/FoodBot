import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {ChatState, ChatSession, ChatMessage} from '../../types';
import {gatewayClient} from '../../services/api/GatewayClient';

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  loading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

export const createNewChatSession = createAsyncThunk(
  'chat/createNewChatSession',
  async (_, {rejectWithValue}) => {
    const result = await gatewayClient.createChatSession();
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return result.data;
  },
);

export const loadChatSession = createAsyncThunk(
  'chat/loadChatSession',
  async (sessionId: string, {rejectWithValue}) => {
    const result = await gatewayClient.getChatSession(sessionId);
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return result.data;
  },
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    {sessionId, content}: {sessionId: string; content: string},
    {rejectWithValue},
  ) => {
    const result = await gatewayClient.sendChatMessage(sessionId, content);
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return result.data;
  },
);

export const loadChatHistory = createAsyncThunk(
  'chat/loadChatHistory',
  async (sessionId: string, {rejectWithValue}) => {
    const result = await gatewayClient.getChatHistory(sessionId);
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return {sessionId, messages: result.data};
  },
);

// ============================================================================
// Slice
// ============================================================================

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveSession: (state, action: PayloadAction<string>) => {
      state.activeSessionId = action.payload;
    },
    clearActiveSession: (state) => {
      state.activeSessionId = null;
    },
    addMessageToSession: (
      state,
      action: PayloadAction<{sessionId: string; message: ChatMessage}>,
    ) => {
      const session = state.sessions.find(
        (s) => s.id === action.payload.sessionId,
      );
      if (session) {
        session.messages.push(action.payload.message);
        session.updatedAt = new Date().toISOString();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create new chat session
    builder.addCase(createNewChatSession.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createNewChatSession.fulfilled, (state, action) => {
      state.loading = false;
      state.sessions.push(action.payload);
      state.activeSessionId = action.payload.id;
    });
    builder.addCase(createNewChatSession.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Load chat session
    builder.addCase(loadChatSession.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loadChatSession.fulfilled, (state, action) => {
      state.loading = false;
      const existingIndex = state.sessions.findIndex(
        (s) => s.id === action.payload.id,
      );
      if (existingIndex >= 0) {
        state.sessions[existingIndex] = action.payload;
      } else {
        state.sessions.push(action.payload);
      }
      state.activeSessionId = action.payload.id;
    });
    builder.addCase(loadChatSession.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Send message
    builder.addCase(sendMessage.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.loading = false;
      // Message is added via addMessageToSession reducer
    });
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Load chat history
    builder.addCase(loadChatHistory.fulfilled, (state, action) => {
      const session = state.sessions.find(
        (s) => s.id === action.payload.sessionId,
      );
      if (session) {
        session.messages = action.payload.messages;
      }
    });
  },
});

export const {
  setActiveSession,
  clearActiveSession,
  addMessageToSession,
  clearError,
} = chatSlice.actions;

export default chatSlice.reducer;

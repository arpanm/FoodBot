import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatService } from '../../services/chat.service';
import { Message } from '../../types/models';

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  jobId: string | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
  jobId: null,
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message: string) => {
    const response = await chatService.sendMessage(message);
    return response;
  }
);

export const pollJobStatus = createAsyncThunk(
  'chat/pollJobStatus',
  async (jobId: string) => {
    const response = await chatService.getJobStatus(jobId);
    return response;
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.jobId = action.payload.jobId;
        state.messages.push(action.payload.message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send message';
      });
  },
});

export const { addMessage, clearMessages, setError, clearError } = chatSlice.actions;
export default chatSlice.reducer;

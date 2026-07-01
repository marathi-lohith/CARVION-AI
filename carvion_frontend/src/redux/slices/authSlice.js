import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false, // Prevents route flickering during early session evaluations
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
    },
    setInitialized: (state, action) => {
      state.isInitialized = action.payload;
    },
    setAuthError: (state, action) => {
      state.error = action.payload;
      state.isInitialized = true;
    },
  },
});

export const { setCredentials, logout, setInitialized, setAuthError } = authSlice.actions;
export default authSlice.reducer;

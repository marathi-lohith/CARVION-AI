import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import themeReducer from './slices/themeSlice.js';
import uiReducer from './slices/uiSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Prevents warning overheads on standard complex payloads
    }),
});

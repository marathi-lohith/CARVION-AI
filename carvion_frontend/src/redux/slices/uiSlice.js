import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  globalLoading: false,
  activeModal: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },
    setActiveModal: (state, action) => {
      state.activeModal = action.payload;
    },
    clearActiveModal: (state) => {
      state.activeModal = null;
    },
  },
});

export const { 
  toggleSidebar, 
  setSidebarCollapsed, 
  setGlobalLoading, 
  setActiveModal, 
  clearActiveModal 
} = uiSlice.actions;

export default uiSlice.reducer;

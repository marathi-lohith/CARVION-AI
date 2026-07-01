import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme as toggle } from '../redux/slices/themeSlice.js';

export default function useTheme() {
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state) => state.theme);

  const toggleTheme = () => {
    dispatch(toggle());
  };

  return {
    darkMode,
    toggleTheme,
  };
}

import { useReducer, useCallback } from 'react';

interface HistoryState<T> {
  history: T[][];
  index: number;
}

type HistoryAction<T> =
  | { type: 'SET'; payload: T[] | ((prev: T[]) => T[]) }
  | { type: 'RESET'; payload: T[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case 'SET': {
      const current = state.history[state.index] || [];
      const nextState =
        typeof action.payload === 'function'
          ? (action.payload as (prev: T[]) => T[])(current)
          : action.payload;
      const newHistory = state.history.slice(0, state.index + 1);
      return { history: [...newHistory, nextState], index: state.index + 1 };
    }
    case 'RESET':
      return { history: [action.payload], index: 0 };
    case 'UNDO':
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case 'REDO':
      return state.index < state.history.length - 1
        ? { ...state, index: state.index + 1 }
        : state;
    default:
      return state;
  }
}

export function useHistory<T>(initialState: T[]) {
  const [state, dispatch] = useReducer(historyReducer<T>, {
    history: [initialState],
    index: 0,
  });

  const setState = useCallback((action: T[] | ((prev: T[]) => T[])) => {
    dispatch({ type: 'SET', payload: action });
  }, []);

  const resetState = useCallback((newState: T[]) => {
    dispatch({ type: 'RESET', payload: newState });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const currentState = state.history[state.index] || [];

  return {
    state: currentState,
    setState,
    resetState,
    undo,
    redo,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
  };
}

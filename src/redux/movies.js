import { actions } from "./actionTypes";
const initialState = { page: 1, sortBy: "" };

const moviesReducer = (state = initialState, action) => {
  switch (action.type) {
    case actions.UPDATE_PAGE:
      return {
        ...state,
        page: action.payload.page,
      };

    case actions.DATA_SORT:
      return {
        ...state,
        sortBy: action.payload.sortBy,
      };

    default:
      return state;
  }
};

export default moviesReducer;

import { actions } from "./actionTypes";

function updatePage(page) {
  return {
    type: actions.UPDATE_PAGE,
    payload: { page },
  };
}

function dataSort(sortBy) {
  return {
    type: actions.DATA_SORT,
    payload: { sortBy },
  };
}

export { updatePage, dataSort };

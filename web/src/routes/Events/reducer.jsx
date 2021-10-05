import produce from 'immer';

export const initialState = Object.freeze({ events: [], reachedEnd: false, searchStrings: {}, deleted: 0 });

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'DELETE_EVENT': {
      const { deletedId } = action;

      return produce(state, (draftState) => {
        const idx = draftState.events.findIndex((e) => e.id === deletedId);
        if (idx === -1) return state;

        draftState.events.splice(idx, 1);
        draftState.deleted++;
      });
    }
    case 'APPEND_EVENTS': {
      const {
        meta: { searchString },
        payload,
      } = action;

      return produce(state, (draftState) => {
        draftState.searchStrings[searchString] = true;
        draftState.events.push(...payload);
        draftState.deleted = 0;
      });
    }

    case 'REACHED_END': {
      const {
        meta: { searchString },
      } = action;
      return produce(state, (draftState) => {
        draftState.reachedEnd = true;
        draftState.searchStrings[searchString] = true;
      });
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
};

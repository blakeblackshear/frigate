export const ascending = ( a, b ) => {
  if( a < b ){
    return -1;
  } else if( a > b ){
    return 1;
  } else {
    return 0;
  }
};

export const descending = ( a, b ) => {
  return -1 * ascending( a, b );
};

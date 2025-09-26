function convertOffsetToTimes(offset, duration) {
    return offset.map((o) => o * duration);
}

export { convertOffsetToTimes };

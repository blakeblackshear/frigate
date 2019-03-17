import numpy as np

# convert shared memory array into numpy array
def tonumpyarray(mp_arr):
    return np.frombuffer(mp_arr.get_obj(), dtype=np.uint8)
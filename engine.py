# The MIT License
#
# Copyright (c) 2020 Alexander Smirnov
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.


import ctypes
import argparse
import sys
import os
import tensorrt as trt

TRT_LOGGER = trt.Logger(trt.Logger.WARNING)


def model_input_shape():
    return 3, 300, 300


def build_engine(uff_model_path, trt_engine_datatype=trt.DataType.FLOAT, batch_size=1):
    with trt.Builder(TRT_LOGGER) as builder, \
            builder.create_network() as network, \
            trt.UffParser() as parser:
        builder.max_workspace_size = 1 << 30
        builder.max_batch_size = batch_size
        if trt_engine_datatype == trt.DataType.HALF:
            builder.fp16_mode = True

        parser.register_input("Input", model_input_shape())
        parser.register_output("MarkOutput_0")
        parser.parse(uff_model_path, network)

        return builder.build_cuda_engine(network)


def save_engine(engine, engine_dest_path):
    os.makedirs(os.path.dirname(engine_dest_path), exist_ok=True)
    buf = engine.serialize()
    with open(engine_dest_path, 'wb') as f:
        f.write(buf)


def load_engine(trt_runtime, engine_path):
    with open(engine_path, 'rb') as f:
        engine_data = f.read()
    engine = trt_runtime.deserialize_cuda_engine(engine_data)
    return engine


def load_plugins():
    trt.init_libnvinfer_plugins(TRT_LOGGER, '')

    try:
        ctypes.CDLL('libflattenconcat.so')
    except Exception as e:
        print("Error: {}\n{}".format(e, "Make sure FlattenConcat custom plugin layer is provided"))
        sys.exit(1)


TRT_PRECISION_TO_DATATYPE = {
    16: trt.DataType.HALF,
    32: trt.DataType.FLOAT
}

if __name__ == '__main__':
    # Define script command line arguments
    parser = argparse.ArgumentParser(description='Utility to build TensorRT engine prior to inference.')
    parser.add_argument('-i', "--input",
                        dest='uff_model_path', metavar='UFF_MODEL_PATH', required=True,
                        help='preprocessed TensorFlow model in UFF format')
    parser.add_argument('-p', '--precision', type=int, choices=[32, 16], default=32,
                        help='desired TensorRT float precision to build an engine with')
    parser.add_argument('-b', '--batch_size', type=int, default=1,
                        help='max TensorRT engine batch size')
    parser.add_argument("-o", "--output", dest='trt_engine_path',
                        help="path of the output file",
                        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "engine.buf"))

    # Parse arguments passed
    args = parser.parse_args()

    load_plugins()

    # Using supplied .uff file alongside with UffParser build TensorRT engine
    print("Building TensorRT engine. This may take few minutes.")
    trt_engine = build_engine(
        uff_model_path=args.uff_model_path,
        trt_engine_datatype=TRT_PRECISION_TO_DATATYPE[args.precision],
        batch_size=args.batch_size)

    # Save the engine to file
    save_engine(trt_engine, args.trt_engine_path)
    print("TensorRT engine saved to {}".format(args.trt_engine_path))

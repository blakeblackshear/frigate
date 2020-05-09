/*
*  The MIT License
*  
*  Copyright (c) 2020 NVIDIA Corporation
*  
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the "Software"), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*  
*  The above copyright notice and this permission notice shall be included in all
*  copies or substantial portions of the Software.
*  
*  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
*  SOFTWARE.
*/

/*
 *  The TensorFlow SSD graph has some operations that are currently not supported in TensorRT.
 *  Using a preprocessor on the graph, multiple operations in the graph are combined into a
 *  single custom operation which is implemented as a plugin layer in TensorRT. The preprocessor
 *  stitches all nodes within a namespace into one custom node.
 *
 *  The plugin called `FlattenConcat` is used to flatten each input and then concatenate the
 *  results. This is applied to the location and confidence data before it is fed to the post
 *  processor step.
 *
 *  Loading FlattenConcat plugin library using CDLL has a side effect of loading FlattenConcat
 *  plugin into internal TensorRT plugin registry: the latter has FlattenConcat shipped with
 *  TensorRT, while we load own version. There are subtle differences between built-in
 *  FlattenConcat and this one.
 *
 *  The pre-trained TensorFlow model has been converted to UFF format using this FlattenConcat
 *  plugin and we have to stick to it when building a TensorRT inference engine. To avoid collision
 *  with built-in plugin of the same name of version "1" we set version "B" and load it the last.
 */

#include <algorithm>
#include <cassert>
#include <iostream>
#include <numeric>
#include <vector>

#include <cublas_v2.h>

#include "NvInferPlugin.h"

// Macro for calling GPU functions
#define CHECK(status)                             \
    do                                            \
    {                                             \
        auto ret = (status);                      \
        if (ret != 0)                             \
        {                                         \
            std::cout << "Cuda failure: " << ret; \
            abort();                              \
        }                                         \
    } while (0)

using namespace nvinfer1;

namespace
{
const char* FLATTENCONCAT_PLUGIN_VERSION{"B"};
const char* FLATTENCONCAT_PLUGIN_NAME{"FlattenConcat_TRT"};
}

// Flattens all input tensors and concats their flattened version together
// along the major non-batch dimension, i.e axis = 1
class FlattenConcat : public IPluginV2
{
public:
    // Ordinary ctor, plugin not yet configured for particular inputs/output
    FlattenConcat() {}

    // Ctor for clone()
    FlattenConcat(const int* flattenedInputSize, int numInputs, int flattenedOutputSize)
        : mFlattenedOutputSize(flattenedOutputSize)
    {
        for (int i = 0; i < numInputs; ++i)
            mFlattenedInputSize.push_back(flattenedInputSize[i]);
    }

    // Ctor for loading from serialized byte array
    FlattenConcat(const void* data, size_t length)
    {
        const char* d = reinterpret_cast<const char*>(data);
        const char* a = d;

        size_t numInputs = read<size_t>(d);
        for (size_t i = 0; i < numInputs; ++i)
        {
            mFlattenedInputSize.push_back(read<int>(d));
        }
        mFlattenedOutputSize = read<int>(d);

        assert(d == a + length);
    }

    int getNbOutputs() const override
    {
        // We always return one output
        return 1;
    }

    Dims getOutputDimensions(int index, const Dims* inputs, int nbInputDims) override
    {
        // At least one input
        assert(nbInputDims >= 1);
        // We only have one output, so it doesn't
        // make sense to check index != 0
        assert(index == 0);

        size_t flattenedOutputSize = 0;
        int inputVolume = 0;

        for (int i = 0; i < nbInputDims; ++i)
        {
            // We only support NCHW. And inputs Dims are without batch num.
            assert(inputs[i].nbDims == 3);

            inputVolume = inputs[i].d[0] * inputs[i].d[1] * inputs[i].d[2];
            flattenedOutputSize += inputVolume;
        }

        return DimsCHW(flattenedOutputSize, 1, 1);
    }

    int initialize() override
    {
        // Called on engine initialization, we initialize cuBLAS library here,
        // since we'll be using it for inference
        CHECK(cublasCreate(&mCublas));
        return 0;
    }

    void terminate() override
    {
        // Called on engine destruction, we destroy cuBLAS data structures,
        // which were created in initialize()
        CHECK(cublasDestroy(mCublas));
    }

    size_t getWorkspaceSize(int maxBatchSize) const override
    {
        // The operation is done in place, it doesn't use GPU memory
        return 0;
    }

    int enqueue(int batchSize, const void* const* inputs, void** outputs, void*, cudaStream_t stream) override
    {
        // Does the actual concat of inputs, which is just
        // copying all inputs bytes to output byte array
        size_t inputOffset = 0;
        float* output = reinterpret_cast<float*>(outputs[0]);
        cublasSetStream(mCublas, stream);

        for (size_t i = 0; i < mFlattenedInputSize.size(); ++i)
        {
            const float* input = reinterpret_cast<const float*>(inputs[i]);
            for (int batchIdx = 0; batchIdx < batchSize; ++batchIdx)
            {
                CHECK(cublasScopy(mCublas, mFlattenedInputSize[i],
                                  input + batchIdx * mFlattenedInputSize[i], 1,
                                  output + (batchIdx * mFlattenedOutputSize + inputOffset), 1));
            }
            inputOffset += mFlattenedInputSize[i];
        }

        return 0;
    }

    size_t getSerializationSize() const override
    {
        // Returns FlattenConcat plugin serialization size
        size_t size = sizeof(mFlattenedInputSize[0]) * mFlattenedInputSize.size()
            + sizeof(mFlattenedOutputSize)
            + sizeof(size_t); // For serializing mFlattenedInputSize vector size
        return size;
    }

    void serialize(void* buffer) const override
    {
        // Serializes FlattenConcat plugin into byte array

        // Cast buffer to char* and save its beginning to a,
        // (since value of d will be changed during write)
        char* d = reinterpret_cast<char*>(buffer);
        char* a = d;

        size_t numInputs = mFlattenedInputSize.size();

        // Write FlattenConcat fields into buffer
        write(d, numInputs);
        for (size_t i = 0; i < numInputs; ++i)
        {
            write(d, mFlattenedInputSize[i]);
        }
        write(d, mFlattenedOutputSize);

        // Sanity check - checks if d is offset
        // from a by exactly the size of serialized plugin
        assert(d == a + getSerializationSize());
    }

    void configureWithFormat(const Dims* inputs, int nbInputs, const Dims* outputDims, int nbOutputs, nvinfer1::DataType type, nvinfer1::PluginFormat format, int maxBatchSize) override
    {
        // We only support one output
        assert(nbOutputs == 1);

        // Reset plugin private data structures
        mFlattenedInputSize.clear();
        mFlattenedOutputSize = 0;

        // For each input we save its size, we also validate it
        for (int i = 0; i < nbInputs; ++i)
        {
            int inputVolume = 0;

            // We only support NCHW. And inputs Dims are without batch num.
            assert(inputs[i].nbDims == 3);

            // All inputs dimensions along non concat axis should be same
            for (size_t dim = 1; dim < 3; dim++)
            {
                assert(inputs[i].d[dim] == inputs[0].d[dim]);
            }

            // Size of flattened input
            inputVolume = inputs[i].d[0] * inputs[i].d[1] * inputs[i].d[2];
            mFlattenedInputSize.push_back(inputVolume);
            mFlattenedOutputSize += mFlattenedInputSize[i];
        }
    }

    bool supportsFormat(DataType type, PluginFormat format) const override
    {
        return (type == DataType::kFLOAT && format == PluginFormat::kNCHW);
    }

    const char* getPluginType() const override { return FLATTENCONCAT_PLUGIN_NAME; }

    const char* getPluginVersion() const override { return FLATTENCONCAT_PLUGIN_VERSION; }

    void destroy() override {}

    IPluginV2* clone() const override
    {
        return new FlattenConcat(mFlattenedInputSize.data(), mFlattenedInputSize.size(), mFlattenedOutputSize);
    }

    void setPluginNamespace(const char* pluginNamespace) override
    {
        mPluginNamespace = pluginNamespace;
    }

    const char* getPluginNamespace() const override
    {
        return mPluginNamespace.c_str();
    }

private:
    template <typename T>
    void write(char*& buffer, const T& val) const
    {
        *reinterpret_cast<T*>(buffer) = val;
        buffer += sizeof(T);
    }

    template <typename T>
    T read(const char*& buffer)
    {
        T val = *reinterpret_cast<const T*>(buffer);
        buffer += sizeof(T);
        return val;
    }

    // Number of elements in each plugin input, flattened
    std::vector<int> mFlattenedInputSize;
    // Number of elements in output, flattened
    int mFlattenedOutputSize{0};
    // cuBLAS library handle
    cublasHandle_t mCublas;
    // We're not using TensorRT namespaces in
    // this sample, so it's just an empty string
    std::string mPluginNamespace = "";
};

// PluginCreator boilerplate code for FlattenConcat plugin
class FlattenConcatPluginCreator : public IPluginCreator
{
public:
    FlattenConcatPluginCreator()
    {
        mFC.nbFields = 0;
        mFC.fields = 0;
    }

    ~FlattenConcatPluginCreator() {}

    const char* getPluginName() const override { return FLATTENCONCAT_PLUGIN_NAME; }

    const char* getPluginVersion() const override { return FLATTENCONCAT_PLUGIN_VERSION; }

    const PluginFieldCollection* getFieldNames() override { return &mFC; }

    IPluginV2* createPlugin(const char* name, const PluginFieldCollection* fc) override
    {
        return new FlattenConcat();
    }

    IPluginV2* deserializePlugin(const char* name, const void* serialData, size_t serialLength) override
    {

        return new FlattenConcat(serialData, serialLength);
    }

    void setPluginNamespace(const char* pluginNamespace) override
    {
        mPluginNamespace = pluginNamespace;
    }

    const char* getPluginNamespace() const override
    {
        return mPluginNamespace.c_str();
    }

private:
    static PluginFieldCollection mFC;
    static std::vector<PluginField> mPluginAttributes;
    std::string mPluginNamespace = "";
};

PluginFieldCollection FlattenConcatPluginCreator::mFC{};
std::vector<PluginField> FlattenConcatPluginCreator::mPluginAttributes;

REGISTER_TENSORRT_PLUGIN(FlattenConcatPluginCreator);

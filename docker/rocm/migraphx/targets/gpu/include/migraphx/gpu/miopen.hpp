/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2024 Advanced Micro Devices, Inc. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
#ifndef MIGRAPHX_GUARD_MIGRAPHLIB_MIOPEN_HPP
#define MIGRAPHX_GUARD_MIGRAPHLIB_MIOPEN_HPP

#include <migraphx/manage_ptr.hpp>
#include <migraphx/functional.hpp>
#include <migraphx/config.hpp>
#if MIGRAPHX_USE_MIOPEN
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/lrn.hpp>
#include <miopen/miopen.h>

#include <sstream>

#ifdef MIGRAPHX_HAS_FIND_MODE_API
extern "C" miopenStatus_t
miopenHiddenSetConvolutionFindMode(miopenConvolutionDescriptor_t convDesc, // NOLINT
                                   int findMode);                          // NOLINT
#endif

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace gpu {
using miopen_handle          = MIGRAPHX_MANAGE_PTR(miopenHandle_t, miopenDestroy);
using tensor_descriptor      = MIGRAPHX_MANAGE_PTR(miopenTensorDescriptor_t,
                                              miopenDestroyTensorDescriptor);
using convolution_descriptor = MIGRAPHX_MANAGE_PTR(miopenConvolutionDescriptor_t,
                                                   miopenDestroyConvolutionDescriptor);
using pooling_descriptor     = MIGRAPHX_MANAGE_PTR(miopenPoolingDescriptor_t,
                                               miopenDestroyPoolingDescriptor);
using activation_descriptor  = MIGRAPHX_MANAGE_PTR(miopenActivationDescriptor_t,
                                                  miopenDestroyActivationDescriptor);
using fusion_plan_descriptor = MIGRAPHX_MANAGE_PTR(miopenFusionPlanDescriptor_t,
                                                   miopenDestroyFusionPlan);
using fused_operator_args    = MIGRAPHX_MANAGE_PTR(miopenOperatorArgs_t, miopenDestroyOperatorArgs);

using lrn_descriptor = MIGRAPHX_MANAGE_PTR(miopenLRNDescriptor_t, miopenDestroyLRNDescriptor);

template <class Result, class F, class... Ts>
Result make_obj(F f, Ts... xs)
{
    typename Result::pointer x = nullptr;
    auto status                = f(&x, xs...);
    Result r{x};
    if(status != miopenStatusSuccess)
        MIGRAPHX_THROW("MAKE_OBJ: MIOpen call failed");
    return r;
}

#ifdef MIGRAPHX_HAS_FIND_2_API
using miopen_find_options = MIGRAPHX_MANAGE_PTR(miopenFindOptions_t, miopenDestroyFindOptions);
using miopen_problem      = MIGRAPHX_MANAGE_PTR(miopenProblem_t, miopenDestroyProblem);
using miopen_solution     = MIGRAPHX_MANAGE_PTR(miopenSolution_t, miopenDestroySolution);

inline miopen_solution find_solution(miopenHandle_t handle,
                                     size_t num_inputs,
                                     const miopenTensorArgument_t* tensor_args,
                                     void* workspace,
                                     size_t workspace_size,
                                     miopenProblem_t problem,
                                     bool tune = false)
{
    miopenSolution_t solution;
    size_t found           = 0;
    miopen_find_options fo = make_obj<miopen_find_options>(&miopenCreateFindOptions);
    if(tune)
    {
        miopenSetFindOptionTuning(fo.get(), 1);
    }
#ifdef MIGRAPHX_PREALLOCATE_MIOPEN_BUFFERS
    for(auto i : range(num_inputs))
    {
        auto status = miopenSetFindOptionPreallocatedTensor(
            fo.get(), tensor_args[i].id, tensor_args[i].buffer);
        if(status != miopenStatusSuccess)
            MIGRAPHX_THROW("MIOpen: failed to preallocate tensors for the find process");
    }
    auto status = miopenSetFindOptionPreallocatedWorkspace(fo.get(), workspace, workspace_size);
    if(status != miopenStatusSuccess)
        MIGRAPHX_THROW("MIOpen: failed to preallocate workspace for the find process");
#else
    miopenStatus_t status;
    (void)(num_inputs);
    (void)(tensor_args);
    (void)(workspace_size);
    (void)(workspace);
#endif
    status      = miopenFindSolutions(handle, problem, fo.get(), &solution, &found, 1);
    auto result = miopen_solution{solution};
    if(status != miopenStatusSuccess or found == 0)
        MIGRAPHX_THROW("MIOpen: miopenFindSolutions failed");
    return result;
}

inline void set_tensor_descriptor(miopenTensorArgumentId_t name,
                                  tensor_descriptor& desc,
                                  miopen_problem& problem_ptr)
{
    auto status = miopenSetProblemTensorDescriptor(problem_ptr.get(), name, desc.get());
    if(status != miopenStatusSuccess)
    {
        MIGRAPHX_THROW("setting problem tensor description failed");
    }
}
#endif

inline tensor_descriptor make_tensor(const migraphx::shape& os)
{
    auto s = os.normalize_standard();
    auto t = make_obj<tensor_descriptor>(&miopenCreateTensorDescriptor);
    // Convert to ints
    std::vector<int> lens(s.lens().begin(), s.lens().end());
    std::vector<int> strides(s.strides().begin(), s.strides().end());
    miopenDataType_t d;
    if(s.type() == shape::float_type)
        d = miopenFloat;
    else if(s.type() == shape::half_type)
        d = miopenHalf;
    else if(s.type() == shape::int32_type)
        d = miopenInt32;
    else if(s.type() == shape::int8_type)
        d = miopenInt8;
    else if(s.type() == shape::bf16_type)
        d = miopenBFloat16;
    else
        MIGRAPHX_THROW("MAKE_TENSOR: unsupported type");
    miopenSetTensorDescriptor(t.get(), d, s.lens().size(), lens.data(), strides.data());

    return t;
}

template <class T>
inline convolution_descriptor make_conv(const T& op)
{
    auto c = make_obj<convolution_descriptor>(&miopenCreateConvolutionDescriptor);
    miopenConvolutionMode_t c_mode = miopenConvolution;
    if(op.group > 1)
        c_mode = miopenGroupConv;

    int kdims = op.kdims();
    std::vector<int> padding(std::max(2, kdims), 0);
    std::vector<int> stride(std::max(2, kdims), 1);
    std::vector<int> dilation(std::max(2, kdims), 1);

    std::copy_backward(op.padding.begin(), op.padding.begin() + kdims, padding.end());
    std::copy_backward(op.stride.begin(), op.stride.end(), stride.end());
    std::copy_backward(op.dilation.begin(), op.dilation.end(), dilation.end());

    miopenInitConvolutionNdDescriptor(
        c.get(), padding.size(), padding.data(), stride.data(), dilation.data(), c_mode);
    if(op.group > 1)
        miopenSetConvolutionGroupCount(c.get(), op.group);
#ifdef MIGRAPHX_HAS_FIND_MODE_API
    miopenHiddenSetConvolutionFindMode(c.get(), 1); // Normal mode
#endif
    return c;
}

template <class T>
inline convolution_descriptor make_convolution_backwards(const T& op)
{
    auto c = make_obj<convolution_descriptor>(&miopenCreateConvolutionDescriptor);
    miopenConvolutionMode_t c_mode = miopenTranspose;
    int kdims                      = op.kdims();
    std::vector<int> padding(std::max(2, kdims), 0);
    std::vector<int> stride(std::max(2, kdims), 1);
    std::vector<int> dilation(std::max(2, kdims), 1);

    std::copy_backward(op.padding.begin(), op.padding.end(), padding.end());
    std::copy_backward(op.stride.begin(), op.stride.end(), stride.end());
    std::copy_backward(op.dilation.begin(), op.dilation.end(), dilation.end());

    miopenInitConvolutionNdDescriptor(
        c.get(), padding.size(), padding.data(), stride.data(), dilation.data(), c_mode);
    if(op.group > 1)
        miopenSetConvolutionGroupCount(c.get(), op.group);
    return c;
}

inline pooling_descriptor make_pooling(const migraphx::op::pooling& op)
{
    miopenPoolingMode_t mode;
    if(op.mode == op::pooling_mode::max)
        mode = miopenPoolingMax;
    else if(op.mode == op::pooling_mode::average)
        mode = miopenPoolingAverage;
    else
    {
        std::stringstream ss("Unknown mode for pooling: ");
        ss << op.mode;
        MIGRAPHX_THROW(ss.str());
    }
    if(not std::all_of(
           op.dilations.cbegin(), op.dilations.cend(), [](std::size_t d) { return d == 1; }))
    {
        MIGRAPHX_THROW("Unsupported dilations for pooling: [" + to_string_range(op.dilations) +
                       "]");
    }
    auto p = make_obj<pooling_descriptor>(&miopenCreatePoolingDescriptor);

    int kdims = op.kdims();
    std::vector<int> padding(std::max(2, kdims), 0);
    std::vector<int> stride(std::max(2, kdims), 1);
    std::vector<int> lengths(std::max(2, kdims), 1);

    std::copy_backward(op.padding.begin(), op.padding.begin() + kdims, padding.end());
    std::copy_backward(op.stride.begin(), op.stride.end(), stride.end());
    std::copy_backward(op.lengths.begin(), op.lengths.end(), lengths.end());

    miopenSetNdPoolingDescriptor(
        p.get(), mode, padding.size(), lengths.data(), padding.data(), stride.data());
    return p;
}

inline lrn_descriptor make_lrn(const migraphx::op::lrn& op)
{
    auto ldesc = make_obj<lrn_descriptor>(&miopenCreateLRNDescriptor);
    miopenSetLRNDescriptor(ldesc.get(), miopenLRNCrossChannel, op.size, op.alpha, op.beta, op.bias);
    return ldesc;
}

inline activation_descriptor make_relu()
{
    auto ad = make_obj<activation_descriptor>(&miopenCreateActivationDescriptor);
    miopenSetActivationDescriptor(ad.get(), miopenActivationRELU, 0, 0, 0);
    return ad;
}

inline activation_descriptor make_sigmoid()
{
    auto ad = make_obj<activation_descriptor>(&miopenCreateActivationDescriptor);
    miopenSetActivationDescriptor(ad.get(), miopenActivationLOGISTIC, 0, 0, 0);
    return ad;
}

inline activation_descriptor make_tanh()
{
    auto ad = make_obj<activation_descriptor>(&miopenCreateActivationDescriptor);
    // onnx operator does not apply additional scaling for tanh
    // defaults for alpha and beta are therefore set to 1
    miopenSetActivationDescriptor(ad.get(), miopenActivationTANH, 1, 1, 0);
    return ad;
}

inline activation_descriptor make_abs()
{
    auto ad = make_obj<activation_descriptor>(&miopenCreateActivationDescriptor);
    miopenSetActivationDescriptor(ad.get(), miopenActivationABS, 0, 0, 0);
    return ad;
}

inline activation_descriptor make_leaky_relu(double alpha)
{
    auto ad = make_obj<activation_descriptor>(&miopenCreateActivationDescriptor);
    miopenSetActivationDescriptor(ad.get(), miopenActivationLEAKYRELU, alpha, 0, 0);
    return ad;
}

inline activation_descriptor make_elu(double alpha)
{
    auto ad = make_obj<activation_descriptor>(&miopenCreateActivationDescriptor);
    miopenSetActivationDescriptor(ad.get(), miopenActivationELU, alpha, 0, 0);
    return ad;
}

inline fusion_plan_descriptor make_fusion_plan(const shape& input)
{
    auto t = make_tensor(input);
    return make_obj<fusion_plan_descriptor>(&miopenCreateFusionPlan, miopenVerticalFusion, t.get());
}

// Temporary hack to workaround memory problems in miopen
inline fusion_plan_descriptor make_fusion_plan(const tensor_descriptor& input)
{
    return make_obj<fusion_plan_descriptor>(
        &miopenCreateFusionPlan, miopenVerticalFusion, input.get());
}

inline fused_operator_args make_fused_args()
{
    return make_obj<fused_operator_args>(&miopenCreateOperatorArgs);
}

template <class F>
auto reflect(miopenActivationDescriptor_t ad, F f)
{
    assert(ad != nullptr);
    miopenActivationMode_t mode = miopenActivationPASTHRU;
    double alpha                = 0.0;
    double beta                 = 0.0;
    double gamma                = 0.0;
    miopenGetActivationDescriptor(ad, &mode, &alpha, &beta, &gamma);
    return pack(f(std::move(mode), "mode"),    // NOLINT
                f(std::move(alpha), "alpha"),  // NOLINT
                f(std::move(beta), "beta"),    // NOLINT
                f(std::move(gamma), "gamma")); // NOLINT
}

template <class F>
auto reflect(miopenLRNDescriptor_t lrnd, F f)
{
    assert(lrnd != nullptr);
    miopenLRNMode_t mode = miopenLRNWithinChannel;
    unsigned int n       = 0;
    double alpha         = 0.0;
    double beta          = 0.0;
    double k             = 0.0;
    miopenGetLRNDescriptor(lrnd, &mode, &n, &alpha, &beta, &k);
    return pack(f(std::move(mode), "mode"),   // NOLINT
                f(std::move(n), "n"),         // NOLINT
                f(std::move(alpha), "alpha"), // NOLINT
                f(std::move(beta), "beta"),   // NOLINT
                f(std::move(k), "k"));        // NOLINT
}

} // namespace gpu
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx
#endif
#endif

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
#ifndef MIGRAPHX_GUARD_OPERATORS_HPP
#define MIGRAPHX_GUARD_OPERATORS_HPP

#include <migraphx/op/abs.hpp>
#include <migraphx/op/acos.hpp>
#include <migraphx/op/acosh.hpp>
#include <migraphx/op/add.hpp>
#include <migraphx/op/argmax.hpp>
#include <migraphx/op/argmin.hpp>
#include <migraphx/op/asin.hpp>
#include <migraphx/op/asinh.hpp>
#include <migraphx/op/as_shape.hpp>
#include <migraphx/op/atan.hpp>
#include <migraphx/op/atanh.hpp>
#include <migraphx/op/binary.hpp>
#include <migraphx/op/bitwise_and.hpp>
#include <migraphx/op/broadcast.hpp>
#include <migraphx/op/capture.hpp>
#include <migraphx/op/ceil.hpp>
#include <migraphx/op/clip.hpp>
#include <migraphx/op/common.hpp>
#include <migraphx/op/concat.hpp>
#include <migraphx/op/contiguous.hpp>
#include <migraphx/op/convert.hpp>
#include <migraphx/op/convolution.hpp>
#include <migraphx/op/convolution_backwards.hpp>
#include <migraphx/op/cosh.hpp>
#include <migraphx/op/cos.hpp>
#include <migraphx/op/dimensions_of.hpp>
#include <migraphx/op/div.hpp>
#include <migraphx/op/dot.hpp>
#include <migraphx/op/elu.hpp>
#include <migraphx/op/equal.hpp>
#include <migraphx/op/erf.hpp>
#include <migraphx/op/exp.hpp>
#include <migraphx/op/fill.hpp>
#include <migraphx/op/flatten.hpp>
#include <migraphx/op/floor.hpp>
#include <migraphx/op/fmod.hpp>
#include <migraphx/op/gather.hpp>
#include <migraphx/op/gathernd.hpp>
#include <migraphx/op/get_tuple_elem.hpp>
#include <migraphx/op/greater.hpp>
#include <migraphx/op/group_query_attention.hpp>
#include <migraphx/op/gru.hpp>
#include <migraphx/op/identity.hpp>
#include <migraphx/op/if_op.hpp>
#include <migraphx/op/im2col.hpp>
#include <migraphx/op/isnan.hpp>
#include <migraphx/op/leaky_relu.hpp>
#include <migraphx/op/less.hpp>
#include <migraphx/op/load.hpp>
#include <migraphx/op/log.hpp>
#include <migraphx/op/log2.hpp>
#include <migraphx/op/logical_and.hpp>
#include <migraphx/op/logical_or.hpp>
#include <migraphx/op/logical_xor.hpp>
#include <migraphx/op/logsoftmax.hpp>
#include <migraphx/op/loop.hpp>
#include <migraphx/op/lrn.hpp>
#include <migraphx/op/lstm.hpp>
#include <migraphx/op/max.hpp>
#include <migraphx/op/min.hpp>
#include <migraphx/op/mod.hpp>
#include <migraphx/op/mul.hpp>
#include <migraphx/op/multibroadcast.hpp>
#include <migraphx/op/nearbyint.hpp>
#include <migraphx/op/neg.hpp>
#include <migraphx/op/nonmaxsuppression.hpp>
#include <migraphx/op/nonzero.hpp>
#include <migraphx/op/outline.hpp>
#include <migraphx/op/pad.hpp>
#include <migraphx/op/pooling.hpp>
#include <migraphx/op/pow.hpp>
#include <migraphx/op/prefix_scan_sum.hpp>
#include <migraphx/op/prelu.hpp>
#include <migraphx/op/quant_convolution.hpp>
#include <migraphx/op/quant_dot.hpp>
#include <migraphx/op/recip.hpp>
#include <migraphx/op/reduce_max.hpp>
#include <migraphx/op/reduce_mean.hpp>
#include <migraphx/op/reduce_min.hpp>
#include <migraphx/op/reduce_prod.hpp>
#include <migraphx/op/reduce_sum.hpp>
#include <migraphx/op/relu.hpp>
#include <migraphx/op/reshape.hpp>
#include <migraphx/op/reverse.hpp>
#include <migraphx/op/rnn.hpp>
#include <migraphx/op/rnn_last_cell_output.hpp>
#include <migraphx/op/rnn_last_hs_output.hpp>
#include <migraphx/op/rnn_variable_seq_lens.hpp>
#include <migraphx/op/rnn_var_sl_last_output.hpp>
#include <migraphx/op/roialign.hpp>
#include <migraphx/op/rsqrt.hpp>
#include <migraphx/op/scalar.hpp>
#include <migraphx/op/scan_slice.hpp>
#include <migraphx/op/scatter_none.hpp>
#include <migraphx/op/scatter_add.hpp>
#include <migraphx/op/scatter_mul.hpp>
#include <migraphx/op/scatter_min.hpp>
#include <migraphx/op/scatter_max.hpp>
#include <migraphx/op/scatternd_add.hpp>
#include <migraphx/op/scatternd_none.hpp>
#include <migraphx/op/scatternd_mul.hpp>
#include <migraphx/op/scatternd_max.hpp>
#include <migraphx/op/scatternd_min.hpp>
#include <migraphx/op/sigmoid.hpp>
#include <migraphx/op/sign.hpp>
#include <migraphx/op/sinh.hpp>
#include <migraphx/op/sin.hpp>
#include <migraphx/op/slice.hpp>
#include <migraphx/op/softmax.hpp>
#include <migraphx/op/sqrt.hpp>
#include <migraphx/op/sqdiff.hpp>
#include <migraphx/op/squeeze.hpp>
#include <migraphx/op/step.hpp>
#include <migraphx/op/sub.hpp>
#include <migraphx/op/tanh.hpp>
#include <migraphx/op/tan.hpp>
#include <migraphx/op/topk.hpp>
#include <migraphx/op/transpose.hpp>
#include <migraphx/op/unary.hpp>
#include <migraphx/op/unary_not.hpp>
#include <migraphx/op/undefined.hpp>
#include <migraphx/op/unique.hpp>
#include <migraphx/op/unknown.hpp>
#include <migraphx/op/unsqueeze.hpp>
#include <migraphx/op/where.hpp>

#endif

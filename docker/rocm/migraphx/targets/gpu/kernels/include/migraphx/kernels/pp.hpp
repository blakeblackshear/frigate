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
#ifndef MIGRAPHX_GUARD_KERNELS_PP_HPP
#define MIGRAPHX_GUARD_KERNELS_PP_HPP

// NOLINTBEGIN(*-macro-to-enum)

#define MIGRAPHX_PP_PRIMITIVE_CAT(x, y) x##y
#define MIGRAPHX_PP_CAT(x, y) MIGRAPHX_PP_PRIMITIVE_CAT(x, y)

#define MIGRAPHX_PP_EAT(...)
#define MIGRAPHX_PP_EXPAND(...) __VA_ARGS__
#define MIGRAPHX_PP_COMMA(...) ,

#define MIGRAPHX_PP_IIF(c) MIGRAPHX_PP_PRIMITIVE_CAT(MIGRAPHX_PP_IIF_, c)
#define MIGRAPHX_PP_IIF_0(t, ...) __VA_ARGS__
#define MIGRAPHX_PP_IIF_1(t, ...) t

#define MIGRAPHX_PP_COMPL(b) MIGRAPHX_PP_PRIMITIVE_CAT(MIGRAPHX_PP_COMPL_, b)
#define MIGRAPHX_PP_COMPL_0 1
#define MIGRAPHX_PP_COMPL_1 0

#define MIGRAPHX_PP_BITAND(x) MIGRAPHX_PP_PRIMITIVE_CAT(MIGRAPHX_PP_BITAND_, x)
#define MIGRAPHX_PP_BITAND_0(y) 0
#define MIGRAPHX_PP_BITAND_1(y) y

#define MIGRAPHX_PP_CHECK(...) MIGRAPHX_PP_CHECK_N(__VA_ARGS__, 0, )
#define MIGRAPHX_PP_CHECK_N(x, n, ...) n
#define MIGRAPHX_PP_PROBE(x) x, 1,

#define MIGRAPHX_PP_IS_PAREN(x) MIGRAPHX_PP_CHECK(MIGRAPHX_PP_IS_PAREN_PROBE x)
#define MIGRAPHX_PP_IS_PAREN_PROBE(...) MIGRAPHX_PP_PROBE(~)

#define MIGRAPHX_PP_PRIMITIVE_IS_EMPTY(x) \
    MIGRAPHX_PP_CHECK(MIGRAPHX_PP_PRIMITIVE_IS_EMPTY_PROBE x())
#define MIGRAPHX_PP_PRIMITIVE_IS_EMPTY_PROBE(...) MIGRAPHX_PP_PROBE(~)

#define MIGRAPHX_PP_IS_EMPTY_ARG(x)                                \
    MIGRAPHX_PP_BITAND(MIGRAPHX_PP_COMPL(MIGRAPHX_PP_IS_PAREN(x))) \
    (MIGRAPHX_PP_PRIMITIVE_IS_EMPTY(x))

#define MIGRAPHX_PP_REPEAT0(m, ...) m(0, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT1(m, ...) MIGRAPHX_PP_REPEAT0(m, __VA_ARGS__) m(1, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT2(m, ...) MIGRAPHX_PP_REPEAT1(m, __VA_ARGS__) m(2, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT3(m, ...) MIGRAPHX_PP_REPEAT2(m, __VA_ARGS__) m(3, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT4(m, ...) MIGRAPHX_PP_REPEAT3(m, __VA_ARGS__) m(4, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT5(m, ...) MIGRAPHX_PP_REPEAT4(m, __VA_ARGS__) m(5, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT6(m, ...) MIGRAPHX_PP_REPEAT5(m, __VA_ARGS__) m(6, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT7(m, ...) MIGRAPHX_PP_REPEAT6(m, __VA_ARGS__) m(7, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT8(m, ...) MIGRAPHX_PP_REPEAT7(m, __VA_ARGS__) m(8, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT9(m, ...) MIGRAPHX_PP_REPEAT8(m, __VA_ARGS__) m(9, __VA_ARGS__)
#define MIGRAPHX_PP_REPEAT10(m, ...) MIGRAPHX_PP_REPEAT9(m, __VA_ARGS__) m(10, __VA_ARGS__)

#define MIGRAPHX_PP_REPEAT(n, m, ...) \
    MIGRAPHX_PP_PRIMITIVE_CAT(MIGRAPHX_PP_REPEAT, n)(m, __VA_ARGS__)

#define MIGRAPHX_PP_RES_ARGS() , , , , , , , , , , , , , , ,

#define MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARGS(...) \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARGS_IMPL(__VA_ARGS__)

#define MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARGS_IMPL(                                       \
    m, delim, x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15, ...) \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x0)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x1)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x1)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x2)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x2)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x3)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x3)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x4)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x4)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x5)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x5)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x6)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x6)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x7)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x7)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x8)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x8)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x9)                                       \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x9)                                           \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x10)                                      \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x10)                                          \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x11)                                      \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x11)                                          \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x12)                                      \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x12)                                          \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x13)                                      \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x13)                                          \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x14)                                      \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x14)                                          \
    MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(delim, x15) MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x15)

#define MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARG(m, x) \
    MIGRAPHX_PP_IIF(MIGRAPHX_PP_IS_EMPTY_ARG(x))(MIGRAPHX_PP_EAT, m)(x)

#define MIGRAPHX_PP_EACH_ARGS(m, ...)                        \
    MIGRAPHX_PP_EXPAND(MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARGS( \
        m, MIGRAPHX_PP_EAT, __VA_ARGS__, MIGRAPHX_PP_RES_ARGS()))

#define MIGRAPHX_PP_TRANSFORM_ARGS(m, ...)                   \
    MIGRAPHX_PP_EXPAND(MIGRAPHX_PP_PRIMITIVE_TRANSFORM_ARGS( \
        m, MIGRAPHX_PP_COMMA, __VA_ARGS__, MIGRAPHX_PP_RES_ARGS()))

// NOLINTEND(*-macro-to-enum)

#endif // MIGRAPHX_GUARD_KERNELS_PP_HPP

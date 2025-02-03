/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2023 Advanced Micro Devices, Inc. All rights reserved.
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

#include <migraphx/verify_args.hpp>

MIGRAPHX_DECLARE_ENV_VAR(MIGRAPHX_VERIFY_DUMP_DIFF);

namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {

bool verify_args(const std::string& name,
                 const argument& target_arg,
                 const verify::expected<argument>& ref_arg,
                 verify::tolerance tols)
{
    bool passed = true;
    visit_all(ref_arg.data(), target_arg)([&](auto ref, auto target) {
        double rms_error;
        passed =
            verify::verify_range_with_tolerance(target, verify::expected{ref}, tols, &rms_error);
        if(not passed)
        {
            // TODO: Check for nans
            std::cout << "FAILED: " << name << std::endl;
            std::cout << "RMS Error: " << rms_error << std::endl;
            if(ref.size() < 32 or enabled(MIGRAPHX_VERIFY_DUMP_DIFF{}))
                std::cout << "ref:" << ref << std::endl;
            if(target.size() < 32 or enabled(MIGRAPHX_VERIFY_DUMP_DIFF{}))
                std::cout << "target:" << target << std::endl;
            if(verify::range_zero(ref))
                std::cout << "Ref data is all zeros" << std::endl;
            if(verify::range_zero(target))
                std::cout << "Target data is all zeros" << std::endl;

            auto mxdiff = verify::max_diff(ref, target);
            std::cout << "Max diff: " << mxdiff << std::endl;

            auto idx = verify::mismatch_idx(ref, target, float_equal);
            if(idx < verify::range_distance(ref))
            {
                std::cout << "Mismatch at " << idx << ": " << ref[idx] << " != " << target[idx]
                          << std::endl;
            }

            auto ref_nan_idx = find_idx(ref, verify::not_finite);
            if(ref_nan_idx >= 0)
                std::cout << "Non finite number found in ref at " << ref_nan_idx << ": "
                          << ref[ref_nan_idx] << std::endl;

            auto target_nan_idx = find_idx(target, verify::not_finite);
            if(target_nan_idx >= 0)
                std::cout << "Non finite number found in target at " << target_nan_idx << ": "
                          << target[target_nan_idx] << std::endl;
            std::cout << std::endl;
        }
        else
        {
            if(verify::range_zero(ref))
                std::cout << "Ref data is all zeros" << std::endl;
            if(verify::range_zero(target))
                std::cout << "Target data is all zeros" << std::endl;

            auto ref_nan_idx = find_idx(ref, verify::not_finite);
            if(ref_nan_idx >= 0)
                std::cout << "Non finite number found in ref at " << ref_nan_idx << ": "
                          << ref[ref_nan_idx] << std::endl;

            auto target_nan_idx = find_idx(target, verify::not_finite);
            if(target_nan_idx >= 0)
                std::cout << "Non finite number found in target at " << target_nan_idx << ": "
                          << target[target_nan_idx] << std::endl;
        }
    });
    return passed;
}

bool verify_args_with_tolerance(const std::string& name,
                                const argument& target_arg,
                                const verify::expected<argument>& ref_arg,
                                std::size_t tolerance)
{
    double rms_tol = 0.001;
    target_arg.visit([&](auto ta) { rms_tol = verify::get_rms_tol(ta, tolerance); });
    verify::tolerance tols{rms_tol};
    return verify_args(name, target_arg, ref_arg, tols);
}

} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
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
#ifndef MIGRAPHX_GUARD_OPERATORS_NONMAXSUPPRESSION_HPP
#define MIGRAPHX_GUARD_OPERATORS_NONMAXSUPPRESSION_HPP

#include <array>
#include <cmath>
#include <queue>
#include <cstdint>
#include <iterator>
#include <migraphx/config.hpp>
#include <migraphx/ranges.hpp>
#include <migraphx/float_equal.hpp>
#include <migraphx/algorithm.hpp>
#include <migraphx/tensor_view.hpp>
#include <migraphx/shape_for_each.hpp>
#include <migraphx/check_shapes.hpp>
#include <migraphx/output_iterator.hpp>
#include <migraphx/argument.hpp>
#include <migraphx/par.hpp>

/*
https://github.com/onnx/onnx/blob/main/docs/Operators.md#NonMaxSuppression

Filter out boxes that have high intersection-over-union (IOU) overlap with previously selected
boxes. Bounding boxes with score less than score_threshold are removed. Bounding box format is
indicated by attribute center_point_box. Note that this algorithm is agnostic to where the origin is
in the coordinate system and more generally is invariant to orthogonal transformations and
translations of the coordinate system; thus translating or reflections of the coordinate system
result in the same boxes being selected by the algorithm. The selected_indices output is a set of
integers indexing into the input collection of bounding boxes representing the selected boxes. The
bounding box coordinates corresponding to the selected indices can then be obtained using the Gather
or GatherND operation.

Version
This version of the operator has been available since version 11 of the default ONNX operator set.
Other versions of this operator: 10

Attributes
center_point_box : int (default is 0)
Integer indicate the format of the box data. The default is 0. 0 - the box data is supplied as [y1,
x1, y2, x2] where (y1, x1) and (y2, x2) are the coordinates of any diagonal pair of box corners and
the coordinates can be provided as normalized (i.e., lying in the interval [0, 1]) or absolute.
Mostly used for TF models. 1 - the box data is supplied as [x_center, y_center, width, height].
Mostly used for Pytorch models.

Inputs (2 - 5)
---------------------------------------------------------------------------------------------------------------------
boxes : tensor(float)
An input tensor with shape [num_batches, spatial_dimension, 4].
The single box data format is indicated by center_point_box.

scores : tensor(float)
An input tensor with shape [num_batches, num_classes, spatial_dimension]

max_output_boxes_per_class (optional) : tensor(int64)
Integer representing the maximum number of boxes to be selected per batch per class.
It is a scalar. Default to 0, which means no output.

iou_threshold (optional) : tensor(float)
Float representing the threshold for deciding whether boxes overlap too much with respect to IOU.
It is scalar. Value range [0, 1]. Default to 0.

score_threshold (optional) : tensor(flo187Gat)
Float representing the threshold for deciding when to remove boxes based on score. It is a scalar.
----------------------------------------------------------------------------------------------------------------------
Outputs
selected_indices : tensor(int64)
selected indices from the boxes tensor. [num_selected_indices, 3],
the selected index format is [batch_index, class_index, box_index].
----------------------------------------------------------------------------------------------------------------------
*/
namespace migraphx {
inline namespace MIGRAPHX_INLINE_NS {
namespace op {

struct nonmaxsuppression
{
    bool center_point_box = false;
    bool use_dyn_output   = false;

    template <class Self, class F>
    static auto reflect(Self& self, F f)
    {
        return pack(f(self.center_point_box, "center_point_box"),
                    f(self.use_dyn_output, "use_dyn_output"));
    }

    std::string name() const { return "nonmaxsuppression"; }

    shape compute_shape(std::vector<shape> inputs) const
    {
        // requires at least 2 inputs
        check_shapes{{inputs.at(0), inputs.at(1)}, *this, true}.only_dims(3).same_ndims();
        auto boxes_max_lens = inputs.at(0).max_lens();
        // num batches * num boxes
        const auto max_num_boxes = boxes_max_lens.at(0) * boxes_max_lens.at(1);

        auto fixed_shape_error_check = [&]() {
            auto lens = inputs.front().lens();
            if(lens[1] != inputs.at(1).lens()[2])
            {
                MIGRAPHX_THROW(
                    "NonMaxSuppression: spatial dimension mismatch between boxes and scores input");
            }
            if(lens[0] != inputs.at(1).lens()[0])
            {
                MIGRAPHX_THROW(
                    "NonMaxSuppression: number of batches mismatch between boxes and scores input");
            }
        };

        if(use_dyn_output)
        {
            if(inputs.at(0).dynamic())
            {
                // both boxes and scores should be dynamic
                // check dynamic dimensions are consistent
                const auto boxes_dims  = inputs.at(0).dyn_dims();
                const auto scores_dims = inputs.at(1).dyn_dims();
                if(boxes_dims.at(1) != scores_dims.at(2))
                {
                    MIGRAPHX_THROW("NonMaxSuppression: dynamic spatial dimension mismatch between "
                                   "boxes and scores input");
                }
                if(boxes_dims.at(0) != scores_dims.at(0))
                {
                    MIGRAPHX_THROW("NonMaxSuppression: dynamic number of batches mismatch between "
                                   "boxes and scores input");
                }
            }
            else if(inputs.at(1).dynamic())
            {
                // scores has dynamic shape, boxes fixed shape
                // check that it is only a dynamic number of classes
                const auto scores_dims = inputs.at(1).dyn_dims();
                const auto boxes_lens  = inputs.at(0).lens();
                if(not scores_dims.at(0).is_fixed() or scores_dims.at(0).max != boxes_lens.at(0))
                {
                    MIGRAPHX_THROW("NonMaxSuppression: scores dynamic num_classes; num_batches not "
                                   "fixed or mismatched");
                }
                if(not scores_dims.at(2).is_fixed() or scores_dims.at(2).max != boxes_lens.at(1))
                {
                    MIGRAPHX_THROW("NonMaxSuppression: scores dynamic num_classes; "
                                   "spatial_dimension not fixed or mismatches");
                }
            }
            else
            {
                fixed_shape_error_check();
            }
            std::vector<shape::dynamic_dimension> out_lens = {};
            out_lens.push_back({0, max_num_boxes});
            out_lens.push_back({3, 3});
            return {shape::int64_type, out_lens};
        }
        else
        {
            if(inputs.at(0).dynamic() or inputs.at(1).dynamic())
            {
                MIGRAPHX_THROW(
                    "NonMaxSuppression: dynamic input shape with use_dyn_output set to false");
            }
            fixed_shape_error_check();
            std::vector<std::size_t> out_lens = {max_num_boxes, 3};
            return {shape::int64_type, out_lens};
        }
    }

    struct box
    {
        std::array<double, 2> x;
        std::array<double, 2> y;

        void sort()
        {
            if(x[0] > x[1])
            {
                std::swap(x[0], x[1]);
            }
            if(y[0] > y[1])
            {
                std::swap(y[0], y[1]);
            }
        }

        std::array<double, 2>& operator[](std::size_t i) { return i == 0 ? x : y; }

        double area() const
        {
            assert(x[0] <= x[1]);
            assert(y[0] <= y[1]);
            return (x[1] - x[0]) * (y[1] - y[0]);
        }
    };

    template <class T>
    box batch_box(T boxes, std::size_t box_idx) const
    {
        box result{};
        auto start = boxes + 4 * box_idx;
        if(center_point_box)
        {
            double half_width  = start[2] / 2.0;
            double half_height = start[3] / 2.0;
            double x_center    = start[0];
            double y_center    = start[1];
            result.x           = {x_center - half_width, x_center + half_width};
            result.y           = {y_center - half_height, y_center + half_height};
        }
        else
        {
            result.x = {static_cast<double>(start[1]), static_cast<double>(start[3])};
            result.y = {static_cast<double>(start[0]), static_cast<double>(start[2])};
        }

        result.sort();

        return result;
    }

    inline bool suppress_by_iou(box b1, box b2, double iou_threshold) const
    {
        const double area1 = b1.area();
        const double area2 = b2.area();

        if(area1 <= .0f or area2 <= .0f)
        {
            return false;
        }

        box intersection{};
        for(auto i : range(2))
        {
            intersection[i][0] = std::max(b1[i][0], b2[i][0]);
            intersection[i][1] = std::min(b1[i][1], b2[i][1]);
            if(intersection[i][0] > intersection[i][1])
            {
                return false;
            }
        }

        const double intersection_area = intersection.area();
        const double union_area        = area1 + area2 - intersection_area;

        if(union_area <= .0f)
        {
            return false;
        }

        const double intersection_over_union = intersection_area / union_area;

        return intersection_over_union > iou_threshold;
    }

    // filter boxes below score_threshold
    template <class T>
    std::vector<std::pair<double, int64_t>>
    filter_boxes_by_score(T scores_start, std::size_t num_boxes, double score_threshold) const
    {
        std::vector<std::pair<double, int64_t>> boxes_heap;
        int64_t box_idx = 0;

        if(score_threshold > 0.0)
        {
            transform_if(
                scores_start,
                scores_start + num_boxes,
                std::back_inserter(boxes_heap),
                [&](auto sc) {
                    box_idx++;
                    return sc >= score_threshold;
                },
                [&](auto sc) { return std::make_pair(sc, box_idx - 1); });
        }
        else
        { // score is irrelevant, just push into boxes_heap and make a score-index pair
            std::transform(scores_start,
                           scores_start + num_boxes,
                           std::back_inserter(boxes_heap),
                           [&](auto sc) {
                               box_idx++;
                               return std::make_pair(sc, box_idx - 1);
                           });
        }
        par_sort(boxes_heap.begin(), boxes_heap.end(), std::greater<std::pair<double, int64_t>>{});
        return boxes_heap;
    }

    template <class Output, class Boxes, class Scores>
    std::size_t compute_nms(Output output,
                            Boxes boxes,
                            Scores scores,
                            std::size_t max_output_boxes_per_class,
                            double iou_threshold,
                            double score_threshold) const
    {
        std::fill(output.begin(), output.end(), 0);
        const auto& lens       = scores.get_shape().lens();
        const auto num_batches = lens[0];
        const auto num_classes = lens[1];
        const auto num_boxes   = lens[2];
        // boxes of a class with NMS applied [score, index]
        std::vector<int64_t> selected_indices;
        // iterate over batches and classes
        shape comp_s{shape::double_type, {num_batches, num_classes}};
        shape_for_each(comp_s, [&](const auto& idx) {
            auto batch_idx = idx[0];
            auto class_idx = idx[1];
            // index offset for this class
            auto scores_start = scores.begin() + (batch_idx * num_classes + class_idx) * num_boxes;
            // iterator to first value of this batch
            auto batch_boxes_start = boxes.begin() + batch_idx * num_boxes * 4;
            auto boxes_heap = filter_boxes_by_score(scores_start, num_boxes, score_threshold);
            int64_t selected_boxes_inside_class = 0;
            while(not boxes_heap.empty() and
                  selected_boxes_inside_class < max_output_boxes_per_class)
            {
                // select next top scorer box and remove any boxes from boxes_heap that exceeds IOU
                // threshold with the selected box
                const auto next_top_score = boxes_heap.front();
                auto next_box             = batch_box(batch_boxes_start, next_top_score.second);
                auto next_box_idx         = next_top_score.second;

                selected_boxes_inside_class++;
                selected_indices.push_back(batch_idx);
                selected_indices.push_back(class_idx);
                selected_indices.push_back(next_box_idx);

                std::vector<std::pair<double, int64_t>> remainder_boxes(boxes_heap.size());

                auto it = par_copy_if(
                    boxes_heap.begin() + 1,
                    boxes_heap.end(),
                    remainder_boxes.begin(),
                    [&](auto iou_candidate_box) {
                        auto iou_box = batch_box(batch_boxes_start, iou_candidate_box.second);
                        return not this->suppress_by_iou(iou_box, next_box, iou_threshold);
                    });

                remainder_boxes.resize(it - remainder_boxes.begin());
                boxes_heap = remainder_boxes;
            }
        });
        std::copy(selected_indices.begin(), selected_indices.end(), output.begin());
        return selected_indices.size() / 3;
    }

    argument compute(const shape& output_shape, std::vector<argument> args) const
    {
        // make buffer of maximum size
        shape max_output_shape = {output_shape.type(), output_shape.max_lens()};
        argument result{max_output_shape};

        std::size_t max_output_boxes_per_class =
            (args.size() > 2) ? (args.at(2).at<std::size_t>()) : 0;
        if(max_output_boxes_per_class == 0)
        {
            return result;
        }
        double iou_threshold     = (args.size() > 3) ? (args.at(3).at<double>()) : 0.0f;
        double score_threshold   = (args.size() > 4) ? (args.at(4).at<double>()) : 0.0f;
        std::size_t num_selected = 0;

        result.visit([&](auto output) {
            visit_all(args[0], args[1])([&](auto boxes, auto scores) {
                num_selected = compute_nms(output,
                                           boxes,
                                           scores,
                                           max_output_boxes_per_class,
                                           iou_threshold,
                                           score_threshold);
            });
        });
        if(use_dyn_output)
        {
            return result.reshape({output_shape.type(), {num_selected, 3}});
        }
        else
        {
            return result;
        }
    }
};

} // namespace op
} // namespace MIGRAPHX_INLINE_NS
} // namespace migraphx

#endif

#####################################################################################
# The MIT License (MIT)
#
# Copyright (c) 2015-2025 Advanced Micro Devices, Inc. All rights reserved.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#####################################################################################
import api


def bad_param_error(msg):
    return 'MIGRAPHX_THROW(migraphx_status_bad_param, "{}")'.format(msg)


api.error_type = 'migraphx_status'
api.success_type = 'migraphx_status_success'
api.try_wrap = 'migraphx::try_'
api.bad_param_error = bad_param_error


@api.cwrap('migraphx::shape::type_t')
def shape_type_wrap(p):
    if p.returns:
        p.add_param('migraphx_shape_datatype_t *')
        p.bad_param('${name} == nullptr', 'Null pointer')
        p.write = ['*${name} = migraphx::to_shape_type(${result})']
    else:
        p.add_param('migraphx_shape_datatype_t')
        p.read = 'migraphx::to_shape_type(${name})'


def auto_handle(*args, **kwargs):
    def with_handle(f):
        return api.handle('migraphx_' + f.__name__, 'migraphx::' + f.__name__,
                          *args, **kwargs)(f)

    return with_handle


@api.handle('migraphx_optimals', 'std::set<size_t>')
def optimals(h):
    h.constructor('create',
                  api.params(ptr='const size_t*', size='size_t'),
                  fname='migraphx::make_set<size_t>')


@api.handle('migraphx_dynamic_dimension', 'migraphx::shape::dynamic_dimension')
def dynamic_dimension(h):
    h.constructor('create_min_max', api.params(min='size_t', max='size_t'))
    h.constructor(
        'create_min_max_optimals',
        api.params(min='size_t', max='size_t', optimals='std::set<size_t>'))
    h.method('is_fixed', returns='bool', const=True)
    h.method('equal',
             api.params(x='const migraphx::shape::dynamic_dimension&'),
             invoke='migraphx::equal($@)',
             returns='bool',
             const=True)


@api.handle('migraphx_dynamic_dimensions',
            'std::vector<migraphx::shape::dynamic_dimension>')
def dynamic_dimensions(h):
    h.constructor(
        'create',
        api.params(ptr='const const_migraphx_dynamic_dimension_t*',
                   size='size_t'),
        fname='migraphx::to_obj_vector<const_migraphx_dynamic_dimension_t>')
    h.method('size', returns='size_t')
    h.method('get',
             api.params(idx='size_t'),
             fname='at',
             cpp_name='operator[]',
             returns='const migraphx::shape::dynamic_dimension&')


@auto_handle()
def shape(h):
    h.constructor(
        'create',
        api.params(type='migraphx::shape::type_t',
                   lengths='std::vector<size_t>'))
    h.constructor(
        'create_with_strides',
        api.params(type='migraphx::shape::type_t',
                   lengths='std::vector<size_t>',
                   strides='std::vector<size_t>'))
    h.constructor('create_scalar', api.params(type='migraphx::shape::type_t'))
    h.constructor(
        'create_dynamic',
        api.params(type='migraphx::shape::type_t',
                   dims='std::vector<migraphx::shape::dynamic_dimension>'))
    h.method('lengths',
             fname='lens',
             returns='const std::vector<size_t>&',
             const=True)
    h.method('strides', returns='const std::vector<size_t>&', const=True)
    h.method('dyn_dims',
             returns='std::vector<migraphx::shape::dynamic_dimension>',
             const=True)
    h.method('type', returns='migraphx::shape::type_t', const=True)
    h.method('elements', returns='size_t', const=True)
    h.method('bytes', returns='size_t', const=True)
    h.method('ndim', returns='size_t', const=True)
    h.method('equal',
             api.params(x='const migraphx::shape&'),
             invoke='migraphx::equal($@)',
             returns='bool',
             const=True)
    h.method('standard', returns='bool', const=True)
    h.method('dynamic', returns='bool', const=True)
    h.method('index', api.params(i='size_t'), returns='size_t', const=True)


@auto_handle()
def argument(h):
    h.constructor('create',
                  api.params(shape='const migraphx::shape&', buffer='void*'))
    h.constructor('create_empty', api.params(shape='const migraphx::shape&'))
    h.method('shape',
             fname='get_shape',
             cpp_name='get_shape',
             returns='const migraphx::shape&',
             const=True)
    h.method('buffer',
             fname='data',
             cpp_name='data',
             returns='char*',
             const=True)
    h.method('equal',
             api.params(x='const migraphx::argument&'),
             invoke='migraphx::equal($@)',
             returns='bool',
             const=True)


api.add_function('migraphx_argument_generate',
                 api.params(s='const migraphx::shape&', seed='size_t'),
                 fname='migraphx::generate_argument',
                 returns='migraphx::argument')


@auto_handle()
def target(h):
    h.constructor('create',
                  api.params(name='const char*'),
                  fname='migraphx::get_target')


@api.handle('migraphx_program_parameter_shapes',
            'std::unordered_map<std::string, migraphx::shape>')
def program_parameter_shapes(h):
    h.method('size', returns='size_t')
    h.method('get',
             api.params(name='const char*'),
             fname='at',
             cpp_name='operator[]',
             returns='const migraphx::shape&')
    h.method('names',
             invoke='migraphx::get_names(${program_parameter_shapes})',
             returns='std::vector<const char*>')


@api.handle('migraphx_program_parameters',
            'std::unordered_map<std::string, migraphx::argument>')
def program_parameters(h):
    h.constructor('create')
    h.method('add',
             api.params(name='const char*',
                        argument='const migraphx::argument&'),
             invoke='${program_parameters}[${name}] = ${argument}')


@api.handle('migraphx_arguments', 'std::vector<migraphx::argument>')
def arguments(h):
    h.method('size', returns='size_t')
    h.method('get',
             api.params(idx='size_t'),
             fname='at',
             cpp_name='operator[]',
             returns='const migraphx::argument&')


@api.handle('migraphx_shapes', 'std::vector<migraphx::shape>')
def shapes(h):
    h.method('size', returns='size_t')
    h.method('get',
             api.params(idx='size_t'),
             fname='at',
             cpp_name='operator[]',
             returns='const migraphx::shape&')


@api.handle('migraphx_instruction', 'migraphx::instruction_ref')
def instruction(h):
    pass


@api.handle('migraphx_instructions', 'std::vector<migraphx::instruction_ref>')
def instructions(h):
    h.constructor(
        'create',
        api.params(ptr='const const_migraphx_instruction_t*', size='size_t'),
        fname='migraphx::to_obj_vector<const_migraphx_instruction_t>')


@api.handle('migraphx_modules', 'std::vector<migraphx::module*>')
def modules(h):
    h.constructor('create',
                  api.params(ptr='migraphx_module_t*', size='size_t'),
                  fname='migraphx::to_objptr_vector<migraphx::module*>')


@auto_handle(ref=True)
def module(h):
    h.constructor('create', api.params(name='std::string'))
    h.method('print', invoke='migraphx::print_module($@)', const=True)
    h.method('add_instruction',
             api.params(op='migraphx::operation',
                        args='std::vector<migraphx::instruction_ref>'),
             returns='migraphx::instruction_ref')
    h.method('add_instruction_with_mod_args',
             api.params(op='migraphx::operation',
                        args='std::vector<migraphx::instruction_ref>',
                        module_refs='std::vector<migraphx::module*>'),
             fname='add_instruction',
             returns='migraphx::instruction_ref')
    h.method('add_literal',
             api.params(shape='const migraphx::shape&', buffer='const char*'),
             returns='migraphx::instruction_ref')
    h.method('add_parameter',
             api.params(name='const char*', shape='const migraphx::shape&'),
             returns='migraphx::instruction_ref')
    h.method('add_return',
             api.params(args='std::vector<migraphx::instruction_ref>'),
             returns='migraphx::instruction_ref')
    h.method('add_allocation',
             api.params(s='const migraphx::shape&'),
             invoke='migraphx::add_allocation($@)',
             returns='migraphx::instruction_ref')


@auto_handle()
def program(h):
    h.constructor('create')
    h.method('get_main_module', returns='migraphx::module*')
    h.method('create_module',
             api.params(name='const char*'),
             returns='migraphx::module*')
    h.method(
        'compile',
        api.params(target='migraphx::target',
                   options='migraphx::compile_options'))
    h.method('get_parameter_shapes',
             returns='std::unordered_map<std::string, migraphx::shape>')
    h.method('get_output_shapes',
             invoke='migraphx::get_output_shapes($@)',
             returns='std::vector<migraphx::shape>')
    h.method('print', invoke='migraphx::print_program($@)', const=True)
    h.method('sort')
    h.method('run',
             api.params(
                 params='std::unordered_map<std::string, migraphx::argument>'),
             invoke='migraphx::run($@)',
             returns='std::vector<migraphx::argument>')
    h.method('run_async',
             api.params(
                 params='std::unordered_map<std::string, migraphx::argument>',
                 s='void*',
                 name='const char *'),
             invoke='migraphx::run_async($@)',
             returns='std::vector<migraphx::argument>')
    h.method('equal',
             api.params(x='const migraphx::program&'),
             invoke='migraphx::equal($@)',
             returns='bool',
             const=True)
    h.method('experimental_get_context',
             invoke='migraphx::get_context($@)',
             const=True,
             returns='migraphx::context')


@auto_handle()
def operation(h):
    h.constructor('create',
                  api.params(name='const char*',
                             attributes='const char*',
                             vlist='...'),
                  fname='migraphx::create_op')
    h.method('name', returns='std::string')


api.add_function('migraphx_load',
                 api.params(name='const char*',
                            options='migraphx::file_options'),
                 fname='migraphx::load',
                 returns='migraphx::program')

api.add_function('migraphx_save',
                 api.params(p='migraphx::program&',
                            name='const char*',
                            options='migraphx::file_options'),
                 fname='migraphx::save')


@auto_handle()
def onnx_options(h):
    h.constructor('create')
    h.method(
        'set_input_parameter_shape',
        api.params(name='const char*', dims='std::vector<size_t>'),
        invoke='migraphx::set_input_parameter_shape($@)',
    )
    h.method(
        'set_dyn_input_parameter_shape',
        api.params(name='const char*',
                   dims='std::vector<migraphx::shape::dynamic_dimension>'),
        invoke='migraphx::set_dyn_input_parameter_shape($@)',
    )
    h.method(
        'set_default_dim_value',
        api.params(value='size_t'),
        invoke='migraphx::set_default_dim_value($@)',
    )
    h.method(
        'set_default_dyn_dim_value',
        api.params(dd='const migraphx::shape::dynamic_dimension&'),
        invoke='migraphx::set_default_dyn_dim_value($@)',
    )
    h.method(
        'set_default_loop_iterations',
        api.params(value='int64_t'),
        invoke='migraphx::set_default_loop_iterations($@)',
    )
    h.method(
        'set_limit_loop_iterations',
        api.params(value='int64_t'),
        invoke='migraphx::set_limit_loop_iterations($@)',
    )
    h.method(
        'set_external_data_path',
        api.params(external_data_path='const char*'),
        invoke='migraphx::set_external_data_path($@)',
    )


@auto_handle()
def file_options(h):
    h.constructor('create')
    h.method('set_file_format',
             api.params(format='const char*'),
             invoke='migraphx::set_file_format($@)')


@auto_handle()
def compile_options(h):
    h.constructor('create')
    h.method('set_offload_copy',
             api.params(value='bool'),
             invoke='migraphx::set_offload_copy($@)')
    h.method('set_fast_math',
             api.params(value='bool'),
             invoke='migraphx::set_fast_math($@)')
    h.method('set_exhaustive_tune_flag',
             api.params(value='bool'),
             invoke='migraphx::set_exhaustive_tune_flag($@)')


api.add_function('migraphx_parse_onnx',
                 api.params(name='const char*',
                            options='migraphx::onnx_options'),
                 fname='migraphx::parse_onnx',
                 returns='migraphx::program')

api.add_function('migraphx_parse_onnx_buffer',
                 api.params(data='const void*',
                            size='size_t',
                            options='migraphx::onnx_options'),
                 fname='migraphx::parse_onnx_buffer',
                 returns='migraphx::program')


@auto_handle()
def tf_options(h):
    h.constructor('create')
    h.method(
        'set_nhwc',
        api.params(is_nhwc='bool'),
        invoke='migraphx::set_nhwc($@)',
    )
    h.method(
        'set_input_parameter_shape',
        api.params(name='const char*', dims='std::vector<size_t>'),
        invoke='migraphx::set_input_parameter_shape($@)',
    )
    h.method(
        'set_default_dim_value',
        api.params(value='size_t'),
        invoke='migraphx::set_default_dim_value($@)',
    )
    h.method(
        'set_output_names',
        api.params(names='std::vector<const char*>'),
        invoke='migraphx::set_output_names($@)',
    )


api.add_function('migraphx_parse_tf',
                 api.params(name='const char*',
                            options='migraphx::tf_options'),
                 fname='migraphx::parse_tf',
                 returns='migraphx::program')


@api.handle('migraphx_quantize_op_names', 'std::vector<std::string>')
def quantize_op_names(h):
    h.constructor('create')
    h.method('add', api.params(name='const char*'), fname='push_back')


api.add_function('migraphx_quantize_fp16_with_op_names',
                 api.params(prog='migraphx::program&',
                            name='std::vector<std::string>&'),
                 fname='migraphx::quantize_fp16_with_op_names')

api.add_function('migraphx_quantize_fp16',
                 api.params(prog='migraphx::program&'),
                 fname='migraphx::quantize_fp16')


@auto_handle()
def quantize_int8_options(h):
    h.constructor('create')
    h.method(
        'add_op_name',
        api.params(name='const char*'),
        invoke='migraphx::add_op_name($@)',
    )
    h.method(
        'add_calibration_data',
        api.params(data='std::unordered_map<std::string, migraphx::argument>'),
        invoke='migraphx::add_calibration_data($@)',
    )


api.add_function('migraphx_quantize_int8',
                 api.params(prog='migraphx::program&',
                            target='migraphx::target',
                            options='migraphx::quantize_int8_options'),
                 fname='migraphx::quantize_int8_wrap')


@auto_handle()
def quantize_fp8_options(h):
    h.constructor('create')
    h.method(
        'add_calibration_data',
        api.params(data='std::unordered_map<std::string, migraphx::argument>'),
        invoke='migraphx::add_calibration_data($@)',
    )


api.add_function('migraphx_quantize_fp8',
                 api.params(prog='migraphx::program&',
                            target='migraphx::target',
                            options='migraphx::quantize_fp8_options'),
                 fname='migraphx::quantize_fp8_wrap')


@auto_handle(ref=True)
def context(h):
    h.method('finish', const=True)
    h.method('get_queue', returns='void*', fname='get_queue().unsafe_get')


@api.interface('migraphx_experimental_custom_op',
               'migraphx::experimental_custom_op')
def experimental_custom_op(h):
    h.constructor('create',
                  api.params(obj_typename='const char*', name='const char*'))
    h.virtual('compute',
              api.params(ctx='migraphx::context',
                         output='migraphx::shape',
                         inputs='std::vector<migraphx::argument>'),
              returns='migraphx::argument')
    h.virtual('compute_shape',
              api.params(inputs='std::vector<migraphx::shape>'),
              returns='migraphx::shape')
    h.virtual('output_alias',
              api.params(inputs='std::vector<migraphx::shape>'),
              returns='std::vector<size_t>')
    h.virtual('runs_on_offload_target', returns='bool')
    h.method('register', invoke='migraphx::register_custom_op($@)')

"""TFLite interpreter imports, preferring LiteRT with tflite_runtime fallback."""

try:
    from ai_edge_litert.interpreter import Interpreter, load_delegate
except ModuleNotFoundError:
    from tflite_runtime.interpreter import Interpreter, load_delegate

__all__ = ["Interpreter", "load_delegate"]

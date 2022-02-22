import pytest
from unittest import mock
import sys

def fake_open(filename, *args, **kvargs):
    if filename == '/labelmap.txt':
        content = "0  person\n1  bicycle"
    else:
        raise FileNotFoundError(filename)
    file_object = mock.mock_open(read_data=content).return_value
    file_object.__iter__.return_value = content.splitlines(True)
    return file_object

@pytest.fixture(scope="session", autouse=True)
def filesystem_mock():
    with mock.patch("builtins.open", new=fake_open, create=True):
        yield

# monkeypatch tflite_runtime
# in case of moving to the pytest completely, this can be done in more pyhonic way
module = type(sys)('tflite_runtime')
sys.modules['tflite_runtime'] = module

module = type(sys)('tflite_runtime.interpreter')
module.load_delegate = mock.MagicMock()
sys.modules['tflite_runtime.interpreter'] = module

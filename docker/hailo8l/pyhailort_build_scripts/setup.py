import json
import os

from setuptools import find_packages, setup
from wheel.bdist_wheel import bdist_wheel as orig_bdist_wheel


class NonPurePythonBDistWheel(orig_bdist_wheel):
    """Makes the wheel platform-dependent so it can be based on the _pyhailort architecture"""

    def finalize_options(self):
        orig_bdist_wheel.finalize_options(self)
        self.root_is_pure = False


def _get_hailort_lib_path():
    lib_filename = "libhailort.so"
    lib_path = os.path.join(
        os.path.abspath(os.path.dirname(__file__)),
        f"hailo_platform/pyhailort/{lib_filename}",
    )
    if os.path.exists(lib_path):
        print(f"Found libhailort shared library at: {lib_path}")
    else:
        print(f"Error: libhailort shared library not found at: {lib_path}")
        raise FileNotFoundError(f"libhailort shared library not found at: {lib_path}")
    return lib_path


def _get_pyhailort_lib_path():
    conf_file_path = os.path.join(
        os.path.abspath(os.path.dirname(__file__)), "wheel_conf.json"
    )
    if not os.path.isfile(conf_file_path):
        raise FileNotFoundError(f"Configuration file not found: {conf_file_path}")

    with open(conf_file_path, "r") as conf_file:
        content = json.load(conf_file)
        py_version = content["py_version"]
        arch = content["arch"]
        system = content["system"]
        extension = content["extension"]
        abi = content["abi"]

        # Construct the filename directly
        lib_filename = f"_pyhailort.cpython-{py_version.split('cp')[1]}-{arch}-{system}-{abi}.{extension}"
        lib_path = os.path.join(
            os.path.abspath(os.path.dirname(__file__)),
            f"hailo_platform/pyhailort/{lib_filename}",
        )

        if os.path.exists(lib_path):
            print(f"Found _pyhailort shared library at: {lib_path}")
        else:
            print(f"Error: _pyhailort shared library not found at: {lib_path}")
            raise FileNotFoundError(
                f"_pyhailort shared library not found at: {lib_path}"
            )

        return lib_path


def _get_package_paths():
    packages = []
    pyhailort_lib = _get_pyhailort_lib_path()
    hailort_lib = _get_hailort_lib_path()
    if pyhailort_lib:
        packages.append(pyhailort_lib)
    if hailort_lib:
        packages.append(hailort_lib)
    packages.append(os.path.abspath("hailo_tutorials/notebooks/*"))
    packages.append(os.path.abspath("hailo_tutorials/hefs/*"))
    return packages


if __name__ == "__main__":
    setup(
        author="Hailo team",
        author_email="contact@hailo.ai",
        cmdclass={
            "bdist_wheel": NonPurePythonBDistWheel,
        },
        description="HailoRT",
        entry_points={
            "console_scripts": [
                "hailo=hailo_platform.tools.hailocli.main:main",
            ]
        },
        install_requires=[
            "argcomplete",
            "contextlib2",
            "future",
            "netaddr",
            "netifaces",
            "verboselogs",
            "numpy==1.23.3",
        ],
        name="hailort",
        package_data={
            "hailo_platform": _get_package_paths(),
        },
        packages=find_packages(),
        platforms=[
            "linux_x86_64",
            "linux_aarch64",
            "win_amd64",
        ],
        url="https://hailo.ai/",
        version="4.17.0",
        zip_safe=False,
    )

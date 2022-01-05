# Running unit tests from devcontainer
If you're using devcontainer, you can use the following command to run unit tests:
```
python3 -m unittest
```

# Running unit tests locally
Local development might be a bit trickier. The frigate has a defaults, which are not compatible with the local setup. For instance, `/labelmap.txt` should be located in the root. 

To run unit tests, you can use `tox`. 

### Prerequisites
Make sure you have python3.8 installed in your system. You also might need to install `python3.8-dev` package
```
sudo apt-get update && sudo apt-get install -y python3.8 python3.8-dev
```

### Running tests
To run tests, use `tox -e unittests` command.
`tox` uses pytest runner and rely on `conftest.py` to mock some of the modules and mock builtins.open to read the `/labelmap.txt` file.
#!/bin/bash
set -e;

echo "Checking if languages.js file is present"

pushd ./lib/assets &>/dev/null
if [ -e languages.js ];
then
    echo "languages.js present"
else
    echo "Please run 'node npm/pre-package.js' to get the file languages.js"
    exit 1;
fi
popd &>/dev/null

echo "Creating test files and adding paths to collection for testing form data file uploads"
if [ ! -e dummyFile1.txt ];
then
    echo "Sample file 1" >> dummyFile1.txt;
fi
if [ ! -e dummyFile2.txt ];
then
    echo "Sample file 2" >> dummyFile2.txt;
fi
if [ ! -e dummyFile3.txt ];
then
    echo "Sample file 3" >> dummyFile3.txt;
fi
if [ ! -e dummyBinaryFile.txt ];
then
    echo '\x123\x344\x233\xAdd' >> dummyBinaryFile;
fi
node ./npm/addPathToFormdataFile.js

echo "Running newman for common collection and storing results in newmanResponses.json"
    node ./test/codegen/newman/runNewman.js

if [ -n "$1" ]
then
    CODEGEN=$1;
    if [ ! -d "./codegens/$CODEGEN" ];
    then
        echo "Codegen $CODEGEN doesn't exist, please enter valid name";
        exit 1;
    fi
    echo "$1 : codegen-structure test";
    mocha ./test/codegen/structure.test.js $1;
    echo "$1 : codegen-sanity test";
    mocha ./test/codegen/sanity/sanity.test.js $1;
    echo "$1 : npm test";
    pushd ./codegens/$CODEGEN &>/dev/null;
    npm test;
    popd &>/dev/null;
else
    echo "Running common repository tests"
    # check whether all dependencies used are present in package.json, and vice versa.
    dependency-check ./package.json --no-dev --missing

    # check for .gitignore, license.md, readme.md, .eslintrc and package.json
    mocha ./test/system/repository.test.js;

    # runs test to see if the codegen interface is implemented correctly
    mocha ./test/unit/lib.test.js;

    # Common structure and npm test for each codegen.
    echo -e "Running codegen-structure tests on all the codegens";
    for directory in codegens/*; do
        if [ -d ${directory} ];
        then
            codegen_name=${directory:9} # directory contains codegens/js-jquery, we need to pass js-jquery
            echo "$codegen_name : codegen-structure test";
            mocha ./test/codegen/structure.test.js $codegen_name;
        else
            echo "No Code gen folders present";
            exit 0;
        fi
    done

    # Sanity check for each codegen.
    echo -e "Running codegen-sanity tests on all the codegens";
    for directory in codegens/*; do
        if [ -d ${directory} ];
        then
            codegen_name=${directory:9}
            echo "$codegen_name : codegen-structure test";
            mocha ./test/codegen/sanity/sanity.test.js $codegen_name;
        else
            echo "No Code gen folders present";
            exit 0;
        fi
    done

    echo -e "Running npm test on all the codegens";
    for directory in codegens/*; do
        if [ -d ${directory} ];
        then
            codegen_name=${directory:9} # directory contains codegens/js-jquery, we need to pass js-jquery
            echo "$codegen_name : npm test";
            pushd $directory &>/dev/null;
            npm test;
            popd &>/dev/null;
        else
            echo "No Code gen folders present";
            exit 0;
        fi
    done

fi

echo "Deleting test files used for testing form data file uploads"
# Also handles the case when files does not exist
rm -f -- dummyFile1.txt dummyFile2.txt dummyFile3.txt dummyBinaryFile;
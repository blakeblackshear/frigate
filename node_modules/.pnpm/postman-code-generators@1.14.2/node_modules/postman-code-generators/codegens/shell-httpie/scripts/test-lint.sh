#!/bin/bash
# ----------------------------------------------------------------------------------------------------------------------
# This script is intended to contain all actions pertaining to code style checking, linting and normalisation.
#
# 1. The script executes linting routines on specific folders.
# ----------------------------------------------------------------------------------------------------------------------

# Stop on first error
set -e;

# banner
echo -e "\033[93mLinting and style-checking...\033[0m";
echo -en "\033[0m\033[2m";
echo -e "eslint `eslint -v`\033[0m\n";

# run style checker
eslint ./lib/** ./test/** ;
echo -en "\033[92mNo lint errors found.\n\033[0m";

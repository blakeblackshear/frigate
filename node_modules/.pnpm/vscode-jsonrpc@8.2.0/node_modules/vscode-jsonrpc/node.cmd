@echo off
REM This file is necessary to ensure that under Windows we don't
REM run the node.js file in the Windows Script Host when using
REM node in packakge.json scripts. See also PATHEXT setting
node.exe %*
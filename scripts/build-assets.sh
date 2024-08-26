#!/bin/sh

export EXN_DISABLE="True"

echo $BITBUCKET_BUILD_NUMBER > ./release-id

node app @apostrophecms/asset:build

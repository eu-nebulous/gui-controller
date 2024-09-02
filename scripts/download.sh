#!/bin/bash -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

source $SCRIPT_DIR/.secrets

MONGODUMP_BIN="docker exec $DOCKER_IMAGE mongodump"
MONGORESTORE_BIN="docker exec $DOCKER_IMAGE mongorestore"

FROM_URI="mongodb+srv://${FROM_DB_USER}:${FROM_DB_PASSWORD}@${FROM_DB_HOST}/${FROM_DB}?tls=true&authSource=admin&replicaSet=exz-nebulous-db"
TO_URI="mongodb://${TO_DB_USER}:${TO_DB_PASSWORD}@${TO_DB_HOST}/?retryWrites=true&loadBalanced=false&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000"

DUMP_ARCHIVE="/tmp/${FROM_DB}-${TO_DB}.dump"
rm -rf "${DUMP_ARCHIVE}"

#
echo $MONGODUMP_BIN --uri="${FROM_URI}" --archive="${DUMP_ARCHIVE}" --db="${FROM_DB}"
$MONGODUMP_BIN --uri="${FROM_URI}" --archive="${DUMP_ARCHIVE}" --db="${FROM_DB}"

echo $MONGORESTORE_BIN --uri="${TO_URI}" --archive="${DUMP_ARCHIVE}" --drop --nsExclude="${FROM_DB}.system.*" --nsFrom="${FROM_DB}.*" --nsTo="${TO_DB}.*"
$MONGORESTORE_BIN --uri="${TO_URI}" --archive="${DUMP_ARCHIVE}" --drop --nsExclude="${FROM_DB}.system.*" --nsInclude="${FROM_DB}.*" --nsFrom="${FROM_DB}.*" --nsTo="${TO_DB}.*"



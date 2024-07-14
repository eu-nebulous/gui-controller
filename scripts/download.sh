#!/bin/bash -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

source $SCRIPT_DIR/.secrets


MONGODUMP_BIN="docker exec $DOCKER_IMAGE mongodump"
MONGORESTORE_BIN="docker exec $DOCKER_IMAGE mongorestore"


FROM_URI="mongodb+srv://doadmin:$FROM_DB_PASSWORD@db-exz-nebulous-staging-710ec947.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=db-exz-nebulous-staging"

TO_URI="mongodb+srv://$TO_DB_USER:$TO_DB_PASSWORD@exz-nebulous-db-40f8722d.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=exz-nebulous-db"


DUMP_ARCHIVE="/tmp/${FROM_DB}-${TO_DB}.dump"
rm -rf "${DUMP_ARCHIVE}"

#
echo $MONGODUMP_BIN --uri="${FROM_URI}" --archive="${DUMP_ARCHIVE}" --db="${FROM_DB}"
$MONGODUMP_BIN --uri="${FROM_URI}" --archive="${DUMP_ARCHIVE}" --db="${FROM_DB}"

echo $MONGORESTORE_BIN --uri="${TO_URI}" --archive="${DUMP_ARCHIVE}" --drop --nsExclude="${FROM_DB}.system.*" --nsFrom="${FROM_DB}.*" --nsTo="${TO_DB}.*"
$MONGORESTORE_BIN --uri="${TO_URI}" --archive="${DUMP_ARCHIVE}" --drop --nsExclude="${FROM_DB}.system.*" --nsInclude="${FROM_DB}.*" --nsFrom="${FROM_DB}.*" --nsTo="${TO_DB}.*"



#!/usr/bin/env bash
set -eu
umask 077

export STUDYFLOW_SECURE_COOKIE="${STUDYFLOW_SECURE_COOKIE:-false}"
./mvnw -DskipTests package

java_pid=
detener() {
    if [[ -n "$java_pid" ]]; then
        kill -TERM "$java_pid" 2>/dev/null || true
        wait "$java_pid" || true
    fi
    exit "$1"
}
trap 'detener 130' INT
trap 'detener 143' TERM

while true; do
    "${JAVA_HOME:+$JAVA_HOME/bin/}java" -jar target/students-management-platform.jar \
        --server.address=127.0.0.1 --studyflow.admin.enabled=true &
    java_pid=$!
    if wait "$java_pid"; then
        estado=0
    else
        estado=$?
    fi
    java_pid=

    # Solo la solicitud de reinicio del panel usa este código de salida.
    if [[ "$estado" -ne 75 ]]; then
        exit "$estado"
    fi
done

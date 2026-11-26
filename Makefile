.DEFAULT_GOAL := help
.PHONY: help install frontend backend build run run-h2

help:
	@echo "make install   Instala las dependencias de Angular"
	@echo "make run       Ejecuta Angular (4200) y la API REST con H2 en memoria (6767)"
	@echo "make backend   Ejecuta la API con H2 en memoria y datos de demostración"
	@echo "make frontend  Ejecuta el servidor de desarrollo de Angular"
	@echo "make build     Compila Angular y empaqueta el JAR"

install:
	npm --prefix frontend ci

frontend:
	npm --prefix frontend start

backend:
	cd backend && bash ejecutar-local.sh

build:
	npm --prefix frontend run build
	cd backend && ./mvnw -DskipTests clean package

run run-h2:
	@bash -c 'set -m; \
		$(MAKE) --no-print-directory backend & backend_pid=$$!; \
		$(MAKE) --no-print-directory frontend & frontend_pid=$$!; \
		trap "kill -- -$$backend_pid -$$frontend_pid 2>/dev/null || true" EXIT; \
		trap "exit 130" INT; \
		trap "exit 143" TERM; \
		wait -n "$$backend_pid" "$$frontend_pid"'

.PHONY: help run-h2 run-mysql mysql-check test

help:
	@echo "Available targets:"
	@echo "  make run-h2     Run locally with the in-memory H2 development database"
	@echo "  make run-mysql  Run with the configured MySQL studyflow database"
	@echo "  make mysql-check Check that local MySQL is available"
	@echo "  make test       Run automated tests"

run-h2:
	./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

mysql-check:
	@command -v mysqladmin >/dev/null 2>&1 || { echo "MySQL is not installed. Install it with: sudo apt-get install -y mysql-server mysql-client"; exit 1; }
	@mysqladmin --protocol=tcp -h 127.0.0.1 ping --silent >/dev/null 2>&1 || { echo "MySQL is not running on 127.0.0.1:3306. Start it with: sudo systemctl start mysql"; exit 1; }

run-mysql: mysql-check
	./mvnw spring-boot:run

test:
	./mvnw test

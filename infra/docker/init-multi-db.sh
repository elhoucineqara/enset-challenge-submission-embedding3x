#!/bin/bash
# Creates auth_db, tp_db and rag_db automatically when the postgres container starts.
# rag_db gets the pgvector extension enabled for the RAG pipeline.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE tp_db;
    CREATE DATABASE rag_db;
    GRANT ALL PRIVILEGES ON DATABASE auth_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE tp_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE rag_db TO $POSTGRES_USER;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname rag_db <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL

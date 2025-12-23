#!/bin/bash
source .env
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -f sql/0015_add_pan_card_to_players.sql

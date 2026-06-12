#!/usr/bin/env bash
set -o errexit

# Install required modules
pip install -r requirements.txt

# Compile static assets
python manage.py collectstatic --no-input

# Sync Database migrations
python manage.py migrate
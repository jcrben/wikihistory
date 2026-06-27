#!/usr/bin/env python3
from flask import Flask, jsonify, send_from_directory, request
from datetime import datetime, timezone
import os
import re
import json
import logging
import sys
import wikiedits

app = Flask(__name__)

# Cache completed (past) years to avoid re-querying the Wikipedia API for data
# that can no longer change. The current year is always fetched fresh.
CACHE_DIR = os.environ.get(
    'CONTRIBGRAPH_CACHE', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache'))


def _cache_path(user, year):
  safe_user = re.sub(r'[^A-Za-z0-9_.-]', '_', user)
  return os.path.join(CACHE_DIR, '{}__{}.json'.format(safe_user, year))


def _read_cache(user, year):
  path = _cache_path(user, year)
  if not os.path.exists(path):
    return None
  try:
    with open(path, 'r', encoding='utf-8') as f:
      return json.load(f)
  except (OSError, ValueError) as e:
    # Corrupt/unreadable cache: log and fall through to a live fetch.
    logging.warning('contribgraph cache read failed for %s: %s', path, e)
    return None


def _write_cache(user, year, data):
  try:
    os.makedirs(CACHE_DIR, exist_ok=True)
    tmp = _cache_path(user, year) + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
      json.dump(data, f)
    os.replace(tmp, _cache_path(user, year))  # atomic
  except OSError as e:
    # Caching is best-effort; never fail the request because the cache won't write.
    logging.warning('contribgraph cache write failed for %s/%s: %s', user, year, e)


# Registry of every username people have looked up — a durable, git-tracked list
# of who the tool's users are interested in. Kept alongside the year caches.
USERS_REGISTRY = os.path.join(CACHE_DIR, 'searched-users.json')


def _record_user(user):
  try:
    os.makedirs(CACHE_DIR, exist_ok=True)
    registry = {}
    if os.path.exists(USERS_REGISTRY):
      with open(USERS_REGISTRY, 'r', encoding='utf-8') as f:
        registry = json.load(f)
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    entry = registry.get(user, {'first_seen': now, 'count': 0})
    entry['last_seen'] = now
    entry['count'] = entry.get('count', 0) + 1
    registry[user] = entry
    tmp = USERS_REGISTRY + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
      json.dump(registry, f, indent=2, sort_keys=True)
    os.replace(tmp, USERS_REGISTRY)
  except (OSError, ValueError) as e:
    logging.warning('contribgraph user-registry update failed for %s: %s', user, e)


@app.route('/static/<path:path>')
def serve_static(path):
  return send_from_directory('static', path)


@app.route('/edits/<username>')
def get_edits(username):
  edits = list(wikiedits.get_edits(username, time_limit=365))
  return jsonify(edits)


@app.route('/day_edits/<username>/<date>')
def get_edits_for_day(username, date):
  edits = list(wikiedits.get_edits_for_day(username, date))
  return jsonify(edits)


@app.route('/edits_per_day/<username>')
def get_edits_per_day(username):
  _record_user(username)
  year = request.args.get('year')

  if not year:
    # Default: rolling last 365 days (always live; spans two calendar years).
    date_counts = {d: c for d, c in wikiedits.get_edits_per_day(username, time_limit=365)}
    return jsonify(date_counts)

  is_past_year = year.isdigit() and int(year) < datetime.now(timezone.utc).year

  if is_past_year:
    cached = _read_cache(username, year)
    if cached is not None:
      return jsonify(cached)

  # Wikipedia usercontribs is descending: start = newer bound, end = older bound.
  start = year + '-12-31T23:59:59Z'
  end = year + '-01-01T00:00:00Z'
  date_counts = {d: c for d, c in wikiedits.get_edits_per_day(username, start=start, end=end)}

  if is_past_year:
    _write_cache(username, year, date_counts)

  return jsonify(date_counts)


if __name__ == '__main__':
  if len(sys.argv) > 1 and sys.argv[1].lower().startswith('dev'):
    app.debug = True
    app.run(host='127.0.0.1', port=5000)
  else:
    app.debug = False
    app.run(host='0.0.0.0', port=80)

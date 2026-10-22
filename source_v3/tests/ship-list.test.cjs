const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ships = require('../src/data/Ship_List.json');

test('Ship catalogue has unique IDs and journal identifiers', () => {
  assert.equal(new Set(ships.map(ship => ship.ship_id)).size, ships.length);
  assert.equal(new Set(ships.map(ship => ship.ed_short.toLowerCase())).size, ships.length);
});

test('New vehicles resolve by journal identifier with bundled image assets', () => {
  // Frontier identifiers corroborated by EDDiscovery/EliteDangerousCore Ships.cs.
  for (const [identifier, name] of [
    ['Lander01', 'Nomad'],
    ['MEV_Rhino', 'SRV Rhino'],
    ['Anacondamkii', 'Anaconda Mk II'],
    ['Anaconda', 'Anaconda'],
  ]) {
    const ship = ships.find(entry => entry.ed_short.toLowerCase() === identifier.toLowerCase());
    assert.equal(ship?.ship_full_name, name);
    assert.ok(fs.existsSync(path.join(__dirname, '../src/images/Ships', `${ship.ed_short}.jpg`)));
  }
});

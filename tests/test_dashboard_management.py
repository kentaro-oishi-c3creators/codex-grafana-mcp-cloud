import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from manage import ROOT, canonical, desired_dashboard, load_environment, remap, validate


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.config = load_environment('grafana-cloud')
        self.dashboard = json.loads((ROOT / 'dashboards/synthetic-signals/dashboard.json').read_text())

    def test_all_registered_definitions_validate(self):
        for path in (ROOT / 'config/environments').glob('*.json'):
            config = load_environment(path.stem)
            for name in config['dashboards']:
                desired_dashboard(name, config)

    def test_null_dashboard_links_rejected(self):
        self.dashboard['links'] = None
        with self.assertRaisesRegex(ValueError, 'links must be an array'):
            validate(self.dashboard, self.config)

    def test_null_panel_links_rejected(self):
        self.dashboard['elements']['p1']['spec']['links'] = None
        with self.assertRaisesRegex(ValueError, 'links must be an array'):
            validate(self.dashboard, self.config)

    def test_unknown_datasource_rejected(self):
        self.dashboard['elements']['p1']['spec']['data']['spec']['queries'][0]['spec']['query']['datasource']['name'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'unknown logical datasource'):
            validate(self.dashboard, self.config)

    def test_missing_layout_panel_rejected(self):
        self.dashboard['layout']['spec']['items'].pop()
        with self.assertRaisesRegex(ValueError, 'every panel exactly once'):
            validate(self.dashboard, self.config)

    def test_datasource_mapping_roundtrip_does_not_mutate_source(self):
        original = copy.deepcopy(self.dashboard)
        deployed = remap(self.dashboard, self.config['datasources'])
        self.assertEqual(self.dashboard, original)
        restored = remap(deployed, {v: k for k, v in self.config['datasources'].items()})
        self.assertEqual(restored, original)

    def test_identity_belongs_to_environment(self):
        deployed = desired_dashboard('synthetic-signals', self.config)
        self.assertEqual(deployed['uid'], self.config['dashboards']['synthetic-signals']['uid'])
        self.assertEqual(canonical(deployed), remap(self.dashboard, self.config['datasources']))


if __name__ == '__main__':
    unittest.main()

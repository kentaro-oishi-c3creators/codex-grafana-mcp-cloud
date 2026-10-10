"""Manage versioned Grafana v2 dashboard definitions through official MCP."""
import argparse
import copy
import difflib
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]


def load_environment(name):
    if not name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-_' for c in name):
        raise ValueError('Invalid environment name')
    config = json.loads((ROOT / 'config/environments' / f'{name}.json').read_text())
    if not config['grafana_url'].startswith('https://'):
        raise ValueError('Grafana URL must use HTTPS')
    return config


def validate(dashboard, config):
    if not isinstance(dashboard.get('title'), str) or not dashboard['title']:
        raise ValueError('Dashboard needs a title')
    for field in ('links', 'annotations', 'variables', 'tags'):
        if not isinstance(dashboard.get(field), list):
            raise ValueError(f'{field} must be an array, never null')
    if not isinstance(dashboard['timeSettings'].get('autoRefreshIntervals'), list):
        raise ValueError('autoRefreshIntervals must be an array')
    elements = dashboard['elements']
    if not elements:
        raise ValueError('Dashboard must contain panels')
    ids = set()
    for name, element in elements.items():
        if element['kind'] != 'Panel':
            raise ValueError(f'{name}: only Panel elements are supported')
        panel = element['spec']
        if panel['id'] in ids:
            raise ValueError('Panel IDs must be unique')
        ids.add(panel['id'])
        if not isinstance(panel.get('links'), list):
            raise ValueError(f'{name}: links must be an array')
        group = panel['data']['spec']
        for field in ('queries', 'transformations'):
            if not isinstance(group.get(field), list):
                raise ValueError(f'{name}: {field} must be an array')
        for query in group['queries']:
            ds = query['spec']['query'].get('datasource', {}).get('name')
            if ds and ds not in config['datasources']:
                raise ValueError(f'{name}: unknown logical datasource {ds}')
    if dashboard['layout']['kind'] != 'GridLayout':
        raise ValueError('This manager currently supports GridLayout only')
    refs = [i['spec']['element']['name'] for i in dashboard['layout']['spec']['items']]
    if len(refs) != len(set(refs)) or set(refs) != set(elements):
        raise ValueError('Layout must reference every panel exactly once')


def remap(dashboard, mapping):
    result = copy.deepcopy(dashboard)
    for element in result['elements'].values():
        for query in element['spec']['data']['spec']['queries']:
            ds = query['spec']['query'].get('datasource')
            if ds and ds.get('name') in mapping:
                ds['name'] = mapping[ds['name']]
    return result


def desired_dashboard(name, config):
    if name not in config['dashboards']:
        raise ValueError(f'Dashboard {name} is not registered in this environment')
    source = json.loads((ROOT / 'dashboards' / name / 'dashboard.json').read_text())
    validate(source, config)
    source = remap(source, config['datasources'])
    source['uid'] = config['dashboards'][name]['uid']
    return source


def canonical(dashboard):
    result = copy.deepcopy(dashboard)
    for field in ('uid', 'id', 'version'):
        result.pop(field, None)
    return result


def mcp_environment(config):
    environment = os.environ.copy()
    environment['GRAFANA_URL'] = config['grafana_url']
    if not environment.get(config['token_env']):
        raise ValueError(f"Missing secret: {config['token_env']}; use environment settings")
    environment['GRAFANA_SERVICE_ACCOUNT_TOKEN'] = environment[config['token_env']]
    return environment


def executable():
    binary = ROOT / '.local/bin/mcp-grafana'
    if not binary.is_file():
        raise ValueError('Run bash scripts/setup.sh first')
    return str(binary)


class Client:
    def __init__(self, config):
        self.process = subprocess.Popen(
            [executable(), '-t', 'stdio', '--usage-stats', 'disabled'],
            env=mcp_environment(config), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True)
        self.responses = queue.Queue()
        self.identifier = 0
        threading.Thread(target=self._read, daemon=True).start()
        try:
            self.request('initialize', {'protocolVersion': '2024-11-05', 'capabilities': {},
                'clientInfo': {'name': 'codex-grafana-git', 'version': '1.0'}})
            self.send({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
        except Exception:
            self.close()
            raise

    def _read(self):
        try:
            for line in self.process.stdout:
                self.responses.put(json.loads(line))
        except Exception:
            pass
        finally:
            self.responses.put(None)

    def send(self, message):
        self.process.stdin.write(json.dumps(message) + '\n')
        self.process.stdin.flush()

    def request(self, method, params):
        self.identifier += 1
        self.send({'jsonrpc': '2.0', 'id': self.identifier, 'method': method, 'params': params})
        while True:
            try:
                response = self.responses.get(timeout=30)
            except queue.Empty:
                raise RuntimeError('MCP response timeout') from None
            if response is None:
                raise RuntimeError('MCP server exited')
            if response.get('id') == self.identifier:
                if 'error' in response:
                    raise RuntimeError('MCP protocol error; check server compatibility')
                return response['result']

    def call(self, name, arguments):
        result = self.request('tools/call', {'name': name, 'arguments': arguments})
        if result.get('isError'):
            # Do not echo arbitrary upstream content that could contain sensitive values.
            raise RuntimeError(f'{name} failed; check permissions, UID, schema and network')
        if 'structuredContent' in result:
            return result['structuredContent']
        return json.loads('\n'.join(c['text'] for c in result.get('content', []) if c['type'] == 'text'))

    def close(self):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.process.stdin.close()
        self.process.stdout.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--environment', default='grafana-cloud')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('validate')
    sub.add_parser('serve')
    for command in ('plan', 'apply', 'check', 'export'):
        p = sub.add_parser(command)
        p.add_argument('dashboard')
        if command == 'apply':
            p.add_argument('--write', action='store_true', help='Actually save the dashboard')
            p.add_argument('--create', action='store_true', help='Create a new UID without overwriting')
    args = parser.parse_args()
    config = load_environment(args.environment)
    if args.command == 'validate':
        for name in config['dashboards']:
            desired_dashboard(name, config)
            print(f'{name}: valid')
        return
    if args.command == 'serve':
        os.execve(executable(), [executable(), '-t', 'stdio', '--usage-stats', 'disabled'], mcp_environment(config))
    name = args.dashboard
    desired = desired_dashboard(name, config)
    binding = config['dashboards'][name]
    client = Client(config)
    try:
        if args.command == 'export':
            current = client.call('get_dashboard_by_uid', {'uid': binding['uid']})
            if not current.get('isV2'):
                raise ValueError('This manager supports v2 dashboards only')
            reverse = {value: key for key, value in config['datasources'].items()}
            print(json.dumps(remap(canonical(current['dashboard']), reverse), ensure_ascii=False, indent=2))
            return
        if args.command == 'apply' and args.create and not args.write:
            raise ValueError('--create requires --write; register a fresh UID first')
        if not (args.command == 'apply' and args.create):
            existing = client.call('get_dashboard_by_uid', {'uid': binding['uid']})
            if not existing.get('isV2'):
                raise ValueError('Do not replace a v1 dashboard; migrate it separately')
        if args.command == 'apply' and args.write:
            client.call('update_dashboard', {'dashboard': desired, 'folderUid': binding['folder_uid'],
                'overwrite': not args.create, 'message': 'Apply Git-managed dashboard definition'})
        current = client.call('get_dashboard_by_uid', {'uid': binding['uid']})
        if not current.get('isV2'):
            raise ValueError('Do not replace a v1 dashboard; migrate it separately')
        before = json.dumps(canonical(current['dashboard']), ensure_ascii=False, sort_keys=True, indent=2)
        after = json.dumps(canonical(desired), ensure_ascii=False, sort_keys=True, indent=2)
        if before != after:
            print('\n'.join(difflib.unified_diff(before.splitlines(), after.splitlines(), fromfile='Grafana', tofile='Git')))
            if args.command == 'check' or (args.command == 'apply' and args.write):
                raise RuntimeError('Saved dashboard differs from the Git definition')
        else:
            print(f'{name}: Grafana definition matches Git')
        if args.command == 'apply' and not args.write:
            print('Preview only. Use apply NAME --write to save.')
    finally:
        client.close()


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, KeyError, OSError, json.JSONDecodeError) as error:
        print(f'Error: {error}', file=sys.stderr)
        sys.exit(1)

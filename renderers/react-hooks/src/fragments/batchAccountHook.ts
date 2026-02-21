import { AccountNode } from '@codama/nodes';
import { getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { addFragmentImports, Fragment, fragment, type NameApi } from '../utils';

export function getBatchAccountHookFragment(scope: { accountPath: NodePath<AccountNode>; nameApi: NameApi }): Fragment {
    const node = getLastNodeFromPath(scope.accountPath);
    const { nameApi } = scope;

    const hookName = nameApi.batchAccountHook(node.name);
    const dataType = nameApi.dataType(node.name);
    const decoderFn = nameApi.decoderFunction(node.name);

    let f = fragment`
type ${hookName}Config = {
  rpc: Rpc<SolanaRpcApi>;
};

export function ${hookName}(addresses: Address[], config: ${hookName}Config) {
  const [data, setData] = useState<(${dataType} | null)[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const decoder = useMemo(() => ${decoderFn}(), []);

  useEffect(() => {
    if (addresses.length === 0) {
      setData([]);
      setStatus('success');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const encodedAccounts = await config.rpc
          .getMultipleAccounts(addresses, { encoding: 'base64' })
          .send();
        if (cancelled) return;

        const decoded = encodedAccounts.value.map((account) => {
          if (!account || !account.data) return null;
          return decoder.decode(account.data[0] as unknown as Uint8Array);
        });
        setData(decoded);
        setStatus('success');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [addresses, config.rpc, decoder]);

  return { data, error, status };
}`;

    // React imports.
    f = addFragmentImports(f, 'react', ['useEffect', 'useMemo', 'useState']);

    // Kit imports.
    f = addFragmentImports(f, 'solanaAddresses', ['type Address']);
    f = addFragmentImports(f, 'solanaRpc', ['type Rpc', 'type SolanaRpcApi']);

    // Generated client imports.
    f = addFragmentImports(f, 'generatedClient', [`type ${dataType}`, decoderFn]);

    return f;
}

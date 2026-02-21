import { AccountNode } from '@codama/nodes';
import { getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { addFragmentImports, Fragment, fragment, type NameApi } from '../utils';

export function getAccountHookFragment(scope: { accountPath: NodePath<AccountNode>; nameApi: NameApi }): Fragment {
    const node = getLastNodeFromPath(scope.accountPath);
    const { nameApi } = scope;

    const hookName = nameApi.accountHook(node.name);
    const dataType = nameApi.dataType(node.name);
    const decoderFn = nameApi.decoderFunction(node.name);

    let f = fragment`
type ${hookName}Config = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

export function ${hookName}(address: Address, config: ${hookName}Config) {
  const [data, setData] = useState<${dataType} | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const decoder = useMemo(() => ${decoderFn}(), []);

  useEffect(() => {
    setStatus('loading');
    const abortController = new AbortController();
    const subscription = config.rpcSubscriptions
      .accountNotifications(address, { encoding: 'base64' })
      .subscribe({ abortSignal: abortController.signal });

    (async () => {
      try {
        for await (const notification of await subscription) {
          const rawData = notification.value.data as unknown as Uint8Array;
          setData(decoder.decode(rawData));
          setStatus('success');
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        }
      }
    })();

    return () => abortController.abort();
  }, [address, config.rpcSubscriptions, decoder]);

  return { data, error, status };
}`;

    // React imports.
    f = addFragmentImports(f, 'react', ['useEffect', 'useMemo', 'useState']);

    // Kit imports.
    f = addFragmentImports(f, 'solanaAddresses', ['type Address']);
    f = addFragmentImports(f, 'solanaRpc', ['type Rpc', 'type SolanaRpcApi']);
    f = addFragmentImports(f, 'solanaRpcSubscriptions', ['type RpcSubscriptions', 'type SolanaRpcSubscriptionsApi']);

    // Generated client imports.
    f = addFragmentImports(f, 'generatedClient', [`type ${dataType}`, decoderFn]);

    return f;
}

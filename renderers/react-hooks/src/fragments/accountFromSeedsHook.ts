import { AccountNode, isNodeFilter } from '@codama/nodes';
import { getLastNodeFromPath, LinkableDictionary, NodePath } from '@codama/visitors-core';

import { addFragmentImports, Fragment, fragment, type NameApi } from '../utils';

export function getAccountFromSeedsHookFragment(scope: {
    accountPath: NodePath<AccountNode>;
    linkables: LinkableDictionary;
    nameApi: NameApi;
}): Fragment | undefined {
    const { accountPath, linkables, nameApi } = scope;
    const accountNode = getLastNodeFromPath(accountPath);
    const pdaNode = accountNode.pda ? linkables.get([...accountPath, accountNode.pda]) : undefined;
    if (!pdaNode) return undefined;

    const hookName = nameApi.accountFromSeedsHook(accountNode.name);
    const dataType = nameApi.dataType(accountNode.name);
    const decoderFn = nameApi.decoderFunction(accountNode.name);
    const pdaSeedsType = nameApi.pdaSeedsType(pdaNode.name);
    const findPdaFn = nameApi.pdaFindFunction(pdaNode.name);
    const hasVariableSeeds = pdaNode.seeds.filter(isNodeFilter('variablePdaSeedNode')).length > 0;

    const seedsParam = hasVariableSeeds ? `seeds: ${pdaSeedsType}, ` : '';
    const seedsArg = hasVariableSeeds ? 'seeds, ' : '';
    const seedsDep = hasVariableSeeds ? ', seeds' : '';

    let f = fragment`
type ${hookName}Config = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
  programAddress?: Address;
};

export function ${hookName}(${seedsParam}config: ${hookName}Config) {
  const [address, setAddress] = useState<Address | null>(null);
  const [data, setData] = useState<${dataType} | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const decoder = useMemo(() => ${decoderFn}(), []);

  // Derive PDA address.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const [pda] = await ${findPdaFn}(${seedsArg}{ programAddress: config.programAddress });
        if (!cancelled) setAddress(pda);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [config.programAddress${seedsDep}]);

  // Subscribe to account once address is derived.
  useEffect(() => {
    if (!address) return;
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

  return { address, data, error, status };
}`;

    // React imports.
    f = addFragmentImports(f, 'react', ['useEffect', 'useMemo', 'useState']);

    // Kit imports.
    f = addFragmentImports(f, 'solanaAddresses', ['type Address']);
    f = addFragmentImports(f, 'solanaRpc', ['type Rpc', 'type SolanaRpcApi']);
    f = addFragmentImports(f, 'solanaRpcSubscriptions', ['type RpcSubscriptions', 'type SolanaRpcSubscriptionsApi']);

    // Generated client imports.
    f = addFragmentImports(f, 'generatedClient', [`type ${dataType}`, decoderFn, findPdaFn]);
    if (hasVariableSeeds) {
        f = addFragmentImports(f, 'generatedClient', [`type ${pdaSeedsType}`]);
    }

    return f;
}

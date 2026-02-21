import { isNodeFilter, PdaNode } from '@codama/nodes';
import { getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { addFragmentImports, Fragment, fragment, type NameApi } from '../utils';

export function getPdaHookFragment(scope: { nameApi: NameApi; pdaPath: NodePath<PdaNode> }): Fragment {
    const node = getLastNodeFromPath(scope.pdaPath);
    const { nameApi } = scope;

    const hookName = nameApi.pdaHook(node.name);
    const findPdaFn = nameApi.pdaFindFunction(node.name);
    const pdaSeedsType = nameApi.pdaSeedsType(node.name);
    const hasVariableSeeds = node.seeds.filter(isNodeFilter('variablePdaSeedNode')).length > 0;

    const seedsParam = hasVariableSeeds ? `seeds: ${pdaSeedsType}, ` : '';
    const seedsArg = hasVariableSeeds ? 'seeds, ' : '';
    const seedsDep = hasVariableSeeds ? 'seeds, ' : '';

    let f = fragment`
type ${hookName}Config = {
  programAddress?: Address;
};

export function ${hookName}(${seedsParam}config: ${hookName}Config = {}) {
  const [address, setAddress] = useState<Address | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const [pda] = await ${findPdaFn}(${seedsArg}{ programAddress: config.programAddress });
        if (!cancelled) {
          setAddress(pda);
          setStatus('success');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [${seedsDep}config.programAddress]);

  return { address, error, status };
}`;

    // React imports.
    f = addFragmentImports(f, 'react', ['useEffect', 'useState']);

    // Kit imports.
    f = addFragmentImports(f, 'solanaAddresses', ['type Address']);

    // Generated client imports.
    f = addFragmentImports(f, 'generatedClient', [findPdaFn]);
    if (hasVariableSeeds) {
        f = addFragmentImports(f, 'generatedClient', [`type ${pdaSeedsType}`]);
    }

    return f;
}

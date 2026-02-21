import { ProgramNode } from '@codama/nodes';

import { addFragmentImports, Fragment, fragment, type NameApi } from '../utils';

export function getProgramHookFragment(scope: { nameApi: NameApi; programNode: ProgramNode }): Fragment {
    const { nameApi, programNode } = scope;

    const hookName = nameApi.programHook(programNode.name);
    const addressConstant = nameApi.programAddressConstant(programNode.name);
    const hasErrors = programNode.errors.length > 0;

    const errorImports: string[] = [];
    let errorHelper = '';
    if (hasErrors) {
        const isErrorFn = nameApi.programIsErrorFunction(programNode.name);
        const getErrorMessageFn = nameApi.programGetErrorMessageFunction(programNode.name);
        const errorUnion = nameApi.programErrorUnion(programNode.name);
        errorImports.push(isErrorFn, getErrorMessageFn, `type ${errorUnion}`);
        errorHelper = `
  const decodeError = useCallback((errorCode: number): string | undefined => {
    if (${isErrorFn}(errorCode)) {
      return ${getErrorMessageFn}(errorCode as ${errorUnion});
    }
    return undefined;
  }, []);`;
    }

    const decodeErrorReturn = hasErrors ? ', decodeError' : '';

    let f = fragment`
type ${hookName}Config = {
  programAddress?: Address;
};

export function ${hookName}(config: ${hookName}Config = {}) {
  const programAddress = useMemo(
    () => config.programAddress ?? ${addressConstant},
    [config.programAddress],
  );${errorHelper}

  return { programAddress${decodeErrorReturn} };
}`;

    // React imports.
    const reactImports = ['useMemo'];
    if (hasErrors) reactImports.push('useCallback');
    f = addFragmentImports(f, 'react', reactImports);

    // Kit imports.
    f = addFragmentImports(f, 'solanaAddresses', ['type Address']);

    // Generated client imports.
    f = addFragmentImports(f, 'generatedClient', [addressConstant]);
    if (errorImports.length > 0) {
        f = addFragmentImports(f, 'generatedClient', errorImports);
    }

    return f;
}

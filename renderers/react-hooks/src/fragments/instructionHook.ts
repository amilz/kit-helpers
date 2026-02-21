import { InstructionNode } from '@codama/nodes';
import { getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { addFragmentImports, Fragment, fragment, type NameApi } from '../utils';

export function getInstructionHookFragment(scope: {
    instructionPath: NodePath<InstructionNode>;
    nameApi: NameApi;
}): Fragment {
    const node = getLastNodeFromPath(scope.instructionPath);
    const { nameApi } = scope;

    const hookName = nameApi.instructionHook(node.name);
    const instructionFn = nameApi.instructionSyncFunction(node.name);
    const inputType = nameApi.instructionSyncInputType(node.name);

    let f = fragment`
type ${hookName}Config = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
  signer: TransactionSigner;
};

export function ${hookName}(config: ${hookName}Config) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);

  const send = useCallback(async (input: ${inputType}) => {
    setStatus('sending');
    setError(null);
    setSignature(null);
    try {
      const instruction = ${instructionFn}(input);
      const { value: latestBlockhash } = await config.rpc
        .getLatestBlockhash()
        .send();
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(config.signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstruction(instruction, tx),
      );
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      setStatus('confirming');
      const txSignature = getSignatureFromTransaction(signedTransaction);
      setSignature(txSignature);
      const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc: config.rpc, rpcSubscriptions: config.rpcSubscriptions });
      await sendAndConfirm(signedTransaction as Parameters<typeof sendAndConfirm>[0], {
        commitment: 'confirmed',
      });
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    }
  }, [config.rpc, config.rpcSubscriptions, config.signer]);

  return { error, send, signature, status };
}`;

    // React imports.
    f = addFragmentImports(f, 'react', ['useCallback', 'useState']);

    // Kit imports.
    f = addFragmentImports(f, 'solanaRpc', ['type Rpc', 'type SolanaRpcApi']);
    f = addFragmentImports(f, 'solanaRpcSubscriptions', ['type RpcSubscriptions', 'type SolanaRpcSubscriptionsApi']);
    f = addFragmentImports(f, 'solanaSigners', ['type TransactionSigner', 'signTransactionMessageWithSigners']);
    f = addFragmentImports(f, 'solanaFunctional', ['pipe']);
    f = addFragmentImports(f, 'solanaKeys', ['type Signature']);
    f = addFragmentImports(f, 'solanaTransactionMessages', [
        'appendTransactionMessageInstruction',
        'createTransactionMessage',
        'setTransactionMessageFeePayerSigner',
        'setTransactionMessageLifetimeUsingBlockhash',
    ]);
    f = addFragmentImports(f, 'solanaTransactions', ['getSignatureFromTransaction']);
    f = addFragmentImports(f, 'solanaTransactionConfirmation', ['sendAndConfirmTransactionFactory']);

    // Generated client imports.
    f = addFragmentImports(f, 'generatedClient', [instructionFn, `type ${inputType}`]);

    return f;
}

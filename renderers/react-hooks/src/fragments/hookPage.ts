import { AccountNode } from '@codama/nodes';
import { LinkableDictionary, NodePath } from '@codama/visitors-core';

import { Fragment, mergeFragments, type NameApi } from '../utils';
import { getAccountFromSeedsHookFragment } from './accountFromSeedsHook';
import { getAccountHookFragment } from './accountHook';
import { getBatchAccountHookFragment } from './batchAccountHook';

export function getAccountHookPageFragment(scope: {
    accountPath: NodePath<AccountNode>;
    linkables: LinkableDictionary;
    nameApi: NameApi;
}): Fragment {
    return mergeFragments(
        [getAccountHookFragment(scope), getAccountFromSeedsHookFragment(scope), getBatchAccountHookFragment(scope)],
        cs => cs.filter(Boolean).join('\n\n'),
    );
}

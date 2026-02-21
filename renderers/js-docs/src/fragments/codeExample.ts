import { Fragment, fragment, mdCodeBlock } from '../utils';

export function getCodeExampleFragment(code: string, lang = 'ts'): Fragment {
    return fragment`${mdCodeBlock(code, lang)}`;
}

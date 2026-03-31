import type { SurfnetGetStreamedAccountsApi } from './methods/accounts/get-streamed-accounts';
import type { SurfnetResetAccountApi } from './methods/accounts/reset-account';
import type { SurfnetSetAccountApi } from './methods/accounts/set-account';
import type { SurfnetSetTokenAccountApi } from './methods/accounts/set-token-account';
import type { SurfnetStreamAccountApi } from './methods/accounts/stream-account';
import type { SurfnetPauseClockApi } from './methods/clock/pause-clock';
import type { SurfnetResumeClockApi } from './methods/clock/resume-clock';
import type { SurfnetTimeTravelApi } from './methods/clock/time-travel';
import type { SurfnetGetActiveIdlApi } from './methods/idl/get-active-idl';
import type { SurfnetRegisterIdlApi } from './methods/idl/register-idl';
import type { SurfnetGetLocalSignaturesApi } from './methods/local/get-local-signatures';
import type { SurfnetExportSnapshotApi } from './methods/network/export-snapshot';
import type { SurfnetGetSurfnetInfoApi } from './methods/network/get-surfnet-info';
import type { SurfnetResetNetworkApi } from './methods/network/reset-network';
import type { SurfnetSetSupplyApi } from './methods/network/set-supply';
import type { SurfnetGetProfileResultsByTagApi } from './methods/profiling/get-profile-results-by-tag';
import type { SurfnetGetTransactionProfileApi } from './methods/profiling/get-transaction-profile';
import type { SurfnetProfileTransactionApi } from './methods/profiling/profile-transaction';
import type { SurfnetCloneProgramAccountApi } from './methods/programs/clone-program-account';
import type { SurfnetSetProgramAuthorityApi } from './methods/programs/set-program-authority';
import type { SurfnetWriteProgramApi } from './methods/programs/write-program';
import type { SurfnetRegisterScenarioApi } from './methods/scenario/register-scenario';

export type SurfnetCheatcodesApi = SurfnetCloneProgramAccountApi &
    SurfnetExportSnapshotApi &
    SurfnetGetActiveIdlApi &
    SurfnetGetLocalSignaturesApi &
    SurfnetGetProfileResultsByTagApi &
    SurfnetGetStreamedAccountsApi &
    SurfnetGetSurfnetInfoApi &
    SurfnetGetTransactionProfileApi &
    SurfnetPauseClockApi &
    SurfnetProfileTransactionApi &
    SurfnetRegisterIdlApi &
    SurfnetRegisterScenarioApi &
    SurfnetResetAccountApi &
    SurfnetResetNetworkApi &
    SurfnetResumeClockApi &
    SurfnetSetAccountApi &
    SurfnetSetProgramAuthorityApi &
    SurfnetSetSupplyApi &
    SurfnetSetTokenAccountApi &
    SurfnetStreamAccountApi &
    SurfnetTimeTravelApi &
    SurfnetWriteProgramApi;
